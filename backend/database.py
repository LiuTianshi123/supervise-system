"""
督学管理系统 - 数据库层
SQLite WAL 模式 + Thread-local 连接 + 外键约束
"""
import sqlite3
import os
import threading
import uuid
import hashlib
from datetime import datetime
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', 'supervision.db')

# Thread-local 连接存储
_thread_local = threading.local()

_lock = threading.Lock()


def _get_conn() -> sqlite3.Connection:
    """获取当前线程的数据库连接"""
    conn = getattr(_thread_local, 'conn', None)
    if conn is None:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA busy_timeout=5000")
        conn.row_factory = sqlite3.Row
        _thread_local.conn = conn
    return conn


def _close_conn():
    """关闭当前线程的数据库连接"""
    conn = getattr(_thread_local, 'conn', None)
    if conn:
        conn.close()
        _thread_local.conn = None


@contextmanager
def get_db():
    """获取数据库连接的上下文管理器（自动提交/回滚）"""
    conn = _get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def init_db():
    """初始化数据库，创建所有表"""
    with _lock:
        with get_db() as conn:
            conn.executescript('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
                );

                CREATE TABLE IF NOT EXISTS data_groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS user_data_groups (
                    user_id INTEGER NOT NULL,
                    group_id INTEGER NOT NULL,
                    PRIMARY KEY (user_id, group_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (group_id) REFERENCES data_groups(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS leader_groups (
                    user_id INTEGER NOT NULL,
                    group_id INTEGER NOT NULL,
                    PRIMARY KEY (user_id, group_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (group_id) REFERENCES data_groups(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS students (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    wechat_group_name TEXT DEFAULT '',
                    data_group_id INTEGER,
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (data_group_id) REFERENCES data_groups(id) ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS student_records (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    teaching_date TEXT NOT NULL,
                    time_period TEXT DEFAULT '',
                    course_name TEXT DEFAULT '',
                    course_link TEXT DEFAULT '',
                    supervision_script TEXT DEFAULT '',
                    supervision_status TEXT DEFAULT '课前30分钟发送',
                    wechat_group_name TEXT DEFAULT '',
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                    expires_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS send_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT DEFAULT '',
                    group_name TEXT DEFAULT '',
                    student_name TEXT DEFAULT '',
                    course_name TEXT DEFAULT '',
                    success INTEGER DEFAULT 0,
                    error_msg TEXT DEFAULT '',
                    send_mode TEXT DEFAULT '',
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
                );

                CREATE INDEX IF NOT EXISTS idx_students_group ON students(data_group_id);
                CREATE INDEX IF NOT EXISTS idx_records_student ON student_records(student_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
                CREATE INDEX IF NOT EXISTS idx_send_logs_task ON send_logs(task_id);
                CREATE INDEX IF NOT EXISTS idx_send_logs_created ON send_logs(created_at);
                CREATE INDEX IF NOT EXISTS idx_records_date ON student_records(teaching_date);
            ''')

            # 创建默认管理员
            cur = conn.execute("SELECT id FROM users WHERE username = 'admin'")
            if cur.fetchone() is None:
                pw_hash = hashlib.sha256('admin123'.encode()).hexdigest()
                conn.execute(
                    "INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)",
                    ('admin', pw_hash, '管理员', 'admin')
                )


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ============ Auth ============

def create_session(user_id: int) -> str:
    token = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+24 hours', 'localtime'))",
            (token, user_id)
        )
    return token


def get_session_user(token: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT s.user_id, u.username, u.display_name, u.role, u.is_active "
            "FROM sessions s JOIN users u ON s.user_id = u.id "
            "WHERE s.token = ? AND s.expires_at > datetime('now', 'localtime')",
            (token,)
        ).fetchone()
        if row:
            return dict(row)
    return None


def delete_session(token: str):
    with get_db() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def authenticate(username: str, password: str):
    with get_db() as conn:
        pw_hash = hash_password(password)
        row = conn.execute(
            "SELECT id, username, display_name, role, is_active FROM users WHERE username = ? AND password_hash = ?",
            (username, pw_hash)
        ).fetchone()
        if row:
            return dict(row)
    return None


# ============ User Management ============

def get_all_users():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, username, display_name, role, is_active, created_at FROM users ORDER BY id"
        ).fetchall()
        return [dict(r) for r in rows]


def get_user_by_id(user_id: int):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, username, display_name, role, is_active, created_at FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()
        return dict(row) if row else None


def create_user(username, password_hash, display_name, role='user'):
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)",
            (username, password_hash, display_name, role)
        )
        return cur.lastrowid


def update_user(user_id, **kwargs):
    with get_db() as conn:
        sets = []
        vals = []
        for k, v in kwargs.items():
            sets.append(f"{k} = ?")
            vals.append(v)
        if sets:
            vals.append(user_id)
            conn.execute(f"UPDATE users SET {', '.join(sets)} WHERE id = ?", vals)


def delete_user(user_id):
    with get_db() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))


# ============ Group Management ============

def get_all_groups():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM data_groups ORDER BY id").fetchall()
        groups = []
        for r in rows:
            g = dict(r)
            g['member_count'] = conn.execute(
                "SELECT COUNT(*) FROM user_data_groups WHERE group_id = ?", (g['id'],)
            ).fetchone()[0]
            g['student_count'] = conn.execute(
                "SELECT COUNT(*) FROM students WHERE data_group_id = ?", (g['id'],)
            ).fetchone()[0]
            groups.append(g)
        return groups


def create_group(name, description=''):
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO data_groups (name, description) VALUES (?, ?)",
            (name, description)
        )
        return cur.lastrowid


def update_group(group_id, **kwargs):
    with get_db() as conn:
        sets = []
        vals = []
        for k, v in kwargs.items():
            sets.append(f"{k} = ?")
            vals.append(v)
        if sets:
            vals.append(group_id)
            conn.execute(f"UPDATE data_groups SET {', '.join(sets)} WHERE id = ?", vals)


def delete_group(group_id):
    with get_db() as conn:
        conn.execute("DELETE FROM data_groups WHERE id = ?", (group_id,))


# ============ User-Group Association ============

def get_user_groups(user_id):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT dg.id, dg.name, dg.description FROM data_groups dg "
            "JOIN user_data_groups udg ON dg.id = udg.group_id "
            "WHERE udg.user_id = ?",
            (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]


def set_user_groups(user_id, group_ids):
    with get_db() as conn:
        conn.execute("DELETE FROM user_data_groups WHERE user_id = ?", (user_id,))
        for gid in group_ids:
            conn.execute(
                "INSERT OR IGNORE INTO user_data_groups (user_id, group_id) VALUES (?, ?)",
                (user_id, gid)
            )


def get_leader_groups(user_id):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT dg.id, dg.name FROM data_groups dg "
            "JOIN leader_groups lg ON dg.id = lg.group_id "
            "WHERE lg.user_id = ?",
            (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]


def set_leader_groups(user_id, group_ids):
    with get_db() as conn:
        conn.execute("DELETE FROM leader_groups WHERE user_id = ?", (user_id,))
        for gid in group_ids:
            conn.execute(
                "INSERT OR IGNORE INTO leader_groups (user_id, group_id) VALUES (?, ?)",
                (user_id, gid)
            )


# ============ Student Management ============

def get_students(page=1, page_size=50, keyword='', group_id=None, user_groups=None):
    with get_db() as conn:
        where = []
        params = []

        if keyword:
            where.append("s.name LIKE ?")
            params.append(f"%{keyword}%")

        if group_id:
            where.append("s.data_group_id = ?")
            params.append(group_id)

        # If user has restricted groups, filter by those
        if user_groups is not None and len(user_groups) > 0:
            placeholders = ','.join('?' * len(user_groups))
            where.append(f"s.data_group_id IN ({placeholders})")
            params.extend(user_groups)

        where_clause = f"WHERE {' AND '.join(where)}" if where else ""

        count_row = conn.execute(f"SELECT COUNT(*) FROM students s {where_clause}", params).fetchone()
        total = count_row[0]

        offset = (page - 1) * page_size
        rows = conn.execute(
            f"SELECT s.*, dg.name as group_name FROM students s "
            f"LEFT JOIN data_groups dg ON s.data_group_id = dg.id "
            f"{where_clause} ORDER BY s.created_at DESC LIMIT ? OFFSET ?",
            params + [page_size, offset]
        ).fetchall()
        return [dict(r) for r in rows], total


def get_student_by_id(student_id):
    with get_db() as conn:
        row = conn.execute(
            "SELECT s.*, dg.name as group_name FROM students s "
            "LEFT JOIN data_groups dg ON s.data_group_id = dg.id "
            "WHERE s.id = ?",
            (student_id,)
        ).fetchone()
        return dict(row) if row else None


def create_student(name, wechat_group_name='', data_group_id=None):
    sid = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute(
            "INSERT INTO students (id, name, wechat_group_name, data_group_id) VALUES (?, ?, ?, ?)",
            (sid, name, wechat_group_name, data_group_id)
        )
    return sid


def update_student(student_id, **kwargs):
    with get_db() as conn:
        sets = []
        vals = []
        for k, v in kwargs.items():
            sets.append(f"{k} = ?")
            vals.append(v)
        if sets:
            vals.append(student_id)
            conn.execute(f"UPDATE students SET {', '.join(sets)} WHERE id = ?", vals)


def delete_student(student_id):
    with get_db() as conn:
        conn.execute("DELETE FROM students WHERE id = ?", (student_id,))


# ============ Student Records ============

def get_student_records(student_id):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM student_records WHERE student_id = ? ORDER BY teaching_date DESC, time_period",
            (student_id,)
        ).fetchall()
        return [dict(r) for r in rows]


def add_student_record(student_id, teaching_date, time_period='', course_name='',
                       course_link='', supervision_script='', supervision_status='课前30分钟发送',
                       wechat_group_name=''):
    rid = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute(
            "INSERT INTO student_records (id, student_id, teaching_date, time_period, course_name, "
            "course_link, supervision_script, supervision_status, wechat_group_name) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (rid, student_id, teaching_date, time_period, course_name,
             course_link, supervision_script, supervision_status, wechat_group_name)
        )
    return rid


def update_student_record(record_id, **kwargs):
    with get_db() as conn:
        sets = []
        vals = []
        for k, v in kwargs.items():
            sets.append(f"{k} = ?")
            vals.append(v)
        if sets:
            vals.append(record_id)
            conn.execute(f"UPDATE student_records SET {', '.join(sets)} WHERE id = ?", vals)


def delete_student_record(record_id):
    with get_db() as conn:
        conn.execute("DELETE FROM student_records WHERE id = ?", (record_id,))


def get_all_records(date_from=None, date_to=None, group_id=None, status=None,
                     user_groups=None, page=1, page_size=50):
    with get_db() as conn:
        where = []
        params = []

        if date_from:
            where.append("sr.teaching_date >= ?")
            params.append(date_from)
        if date_to:
            where.append("sr.teaching_date <= ?")
            params.append(date_to)
        if group_id:
            where.append("s.data_group_id = ?")
            params.append(group_id)
        if status:
            where.append("sr.supervision_status = ?")
            params.append(status)
        if user_groups is not None and len(user_groups) > 0:
            placeholders = ','.join('?' * len(user_groups))
            where.append(f"s.data_group_id IN ({placeholders})")
            params.extend(user_groups)

        where_clause = f"WHERE {' AND '.join(where)}" if where else ""

        count_row = conn.execute(
            f"SELECT COUNT(*) FROM student_records sr "
            f"JOIN students s ON sr.student_id = s.id {where_clause}",
            params
        ).fetchone()
        total = count_row[0]

        offset = (page - 1) * page_size
        rows = conn.execute(
            f"SELECT sr.*, s.name as student_name, s.wechat_group_name as student_group_name, "
            f"dg.name as group_name FROM student_records sr "
            f"JOIN students s ON sr.student_id = s.id "
            f"LEFT JOIN data_groups dg ON s.data_group_id = dg.id "
            f"{where_clause} ORDER BY sr.teaching_date DESC, sr.time_period "
            f"LIMIT ? OFFSET ?",
            params + [page_size, offset]
        ).fetchall()
        return [dict(r) for r in rows], total


# ============ Send Logs ============

def add_send_log(task_id, group_name, student_name, course_name, success, error_msg='', send_mode=''):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO send_logs (task_id, group_name, student_name, course_name, success, error_msg, send_mode) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (task_id, group_name, student_name, course_name, int(success), error_msg, send_mode)
        )


def get_send_logs(page=1, page_size=50, success_filter=None):
    with get_db() as conn:
        where = []
        params = []
        if success_filter is not None:
            where.append("success = ?")
            params.append(int(success_filter))

        where_clause = f"WHERE {' AND '.join(where)}" if where else ""

        count_row = conn.execute(f"SELECT COUNT(*) FROM send_logs {where_clause}", params).fetchone()
        total = count_row[0]

        offset = (page - 1) * page_size
        rows = conn.execute(
            f"SELECT * FROM send_logs {where_clause} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            params + [page_size, offset]
        ).fetchall()
        return [dict(r) for r in rows], total


# ============ Stats ============

def get_stats(user_groups=None):
    with get_db() as conn:
        today = datetime.now().strftime('%Y-%m-%d')

        # Student count
        if user_groups and len(user_groups) > 0:
            placeholders = ','.join('?' * len(user_groups))
            student_count = conn.execute(
                f"SELECT COUNT(*) FROM students WHERE data_group_id IN ({placeholders})",
                user_groups
            ).fetchone()[0]
        else:
            student_count = conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]

        # Today's records
        today_records = conn.execute(
            "SELECT COUNT(*) FROM student_records WHERE teaching_date = ?", (today,)
        ).fetchone()[0]

        # Today's sent logs
        today_sent = conn.execute(
            "SELECT COUNT(*) FROM send_logs WHERE created_at LIKE ? AND success = 1",
            (f"{today}%",)
        ).fetchone()[0]

        # Pending tasks (records for today not yet sent)
        # We'll use a simpler approach: records with supervision_status not matching sent logs
        pending = max(0, today_records - today_sent)

        return {
            'student_count': student_count,
            'today_records': today_records,
            'today_sent': today_sent,
            'pending_tasks': pending,
        }


# ============ Batch Import ============

def import_records_json(records, data_group_id, wechat_group_name='', source_file=''):
    """前端 JSON 格式导入：records 是前端解析好的课表记录列表
    每条记录: { studentName, groupName, teachingDate, dayOfWeek, timePeriod,
                courseName, courseLink, supervisionScript, supervisionStatus }
    返回: { new_students, new_records }
    """
    new_students = 0
    new_records = 0
    with get_db() as conn:
        for rec in records:
            student_name = (rec.get('studentName') or '').strip()
            if not student_name:
                continue

            # 使用传入的 data_group_id 和 wechat_group_name
            wx_group = (rec.get('groupName') or wechat_group_name or '').strip()

            # 查找或创建学员（按 name + data_group_id 匹配）
            student = conn.execute(
                "SELECT id FROM students WHERE name = ? AND data_group_id = ?",
                (student_name, data_group_id)
            ).fetchone()

            if not student:
                sid = str(uuid.uuid4())
                conn.execute(
                    "INSERT INTO students (id, name, wechat_group_name, data_group_id) VALUES (?, ?, ?, ?)",
                    (sid, student_name, wx_group, data_group_id)
                )
                student_id = sid
                new_students += 1
            else:
                student_id = student['id']
                # 更新微信群名
                if wx_group:
                    conn.execute(
                        "UPDATE students SET wechat_group_name = ? WHERE id = ?",
                        (wx_group, student_id)
                    )

            teaching_date = (rec.get('teachingDate') or '').strip()
            time_period = (rec.get('timePeriod') or '').strip()
            course_name = (rec.get('courseName') or '').strip()
            course_link = (rec.get('courseLink') or '').strip()
            script = (rec.get('supervisionScript') or '').strip()
            status = (rec.get('supervisionStatus') or '课前30分钟发送').strip()

            if not teaching_date:
                continue

            # 去重检查：同一学员+日期+时段+课程+督学状态 视为同一条
            existing = conn.execute(
                "SELECT id FROM student_records WHERE student_id = ? AND teaching_date = ? "
                "AND time_period = ? AND course_name = ? AND supervision_status = ?",
                (student_id, teaching_date, time_period, course_name, status)
            ).fetchone()

            if not existing:
                rid = str(uuid.uuid4())
                conn.execute(
                    "INSERT INTO student_records (id, student_id, teaching_date, time_period, course_name, "
                    "course_link, supervision_script, supervision_status, wechat_group_name) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (rid, student_id, teaching_date, time_period, course_name,
                     course_link, script, status, wx_group)
                )
                new_records += 1

    return {'new_students': new_students, 'new_records': new_records}


def import_students_and_records(data):
    """批量导入学员和课表记录
    data: list of dicts with keys: name, wechat_group_name, group_name,
          teaching_date, time_period, course_name, course_link, supervision_script, supervision_status
    """
    imported = 0
    with get_db() as conn:
        for row in data:
            name = row.get('name', '').strip()
            if not name:
                continue

            # Find or create group
            group_name = row.get('group_name', '').strip()
            group_id = None
            if group_name:
                g = conn.execute("SELECT id FROM data_groups WHERE name = ?", (group_name,)).fetchone()
                if g:
                    group_id = g['id']
                else:
                    cur = conn.execute("INSERT INTO data_groups (name) VALUES (?)", (group_name,))
                    group_id = cur.lastrowid

            # Find or create student
            wechat_group = row.get('wechat_group_name', '').strip()
            student = conn.execute(
                "SELECT id FROM students WHERE name = ? AND (data_group_id = ? OR data_group_id IS NULL)",
                (name, group_id)
            ).fetchone()

            if not student:
                sid = str(uuid.uuid4())
                conn.execute(
                    "INSERT INTO students (id, name, wechat_group_name, data_group_id) VALUES (?, ?, ?, ?)",
                    (sid, name, wechat_group, group_id)
                )
                student_id = sid
            else:
                student_id = student['id']

            # Check if record already exists
            teaching_date = row.get('teaching_date', '').strip()
            time_period = row.get('time_period', '').strip()
            course_name = row.get('course_name', '').strip()
            course_link = row.get('course_link', '').strip()
            script = row.get('supervision_script', '').strip()
            status = row.get('supervision_status', '课前30分钟发送').strip()

            if teaching_date:
                existing = conn.execute(
                    "SELECT id FROM student_records WHERE student_id = ? AND teaching_date = ? AND time_period = ? AND course_name = ?",
                    (student_id, teaching_date, time_period, course_name)
                ).fetchone()
                if not existing:
                    rid = str(uuid.uuid4())
                    conn.execute(
                        "INSERT INTO student_records (id, student_id, teaching_date, time_period, course_name, "
                        "course_link, supervision_script, supervision_status, wechat_group_name) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (rid, student_id, teaching_date, time_period, course_name,
                         course_link, script, status, wechat_group)
                    )
                    imported += 1
    return imported
