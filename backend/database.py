"""
督学管理系统 - CloudBase 数据库层
将 SQLite 操作迁移到腾讯云 CloudBase NoSQL 数据库
"""
import os
import uuid
import hashlib
from datetime import datetime, timedelta

# CloudBase SDK
try:
    import cloudbase
    CLOUDBASE_AVAILABLE = True
except ImportError:
    cloudbase = None
    CLOUDBASE_AVAILABLE = False

# 数据库实例缓存
_app = None
_db = None


def _get_db():
    """获取 CloudBase 数据库实例（延迟初始化）"""
    global _app, _db
    if not CLOUDBASE_AVAILABLE:
        raise RuntimeError("cloudbase 库未安装，请运行: pip install cloudbase")
    if _app is None:
        # 云函数环境下自动检测环境ID，本地需要设置环境变量
        env_id = os.environ.get('TCB_ENV_ID', os.environ.get('CLOUDBASE_ENV_ID', ''))
        if env_id:
            _app = cloudbase.init({'env': env_id})
        else:
            _app = cloudbase.init()  # 云函数环境自动检测
        _db = _app.database()
    return _db


def _col(name):
    """获取集合引用"""
    return _get_db().collection(name)


def _doc_to_dict(doc):
    """将 CloudBase 文档转为普通字典，统一添加 id 字段"""
    if not doc:
        return None
    if isinstance(doc, dict):
        d = dict(doc)
        d['id'] = d.get('_id', d.get('id', ''))
        return d
    return None


def _docs_to_list(docs):
    """批量转换文档列表"""
    if not docs:
        return []
    return [d for d in (_doc_to_dict(x) for x in docs) if d]


# ============ 兼容层：上下文管理器 + 初始化 ============

class _FakeConn:
    """模拟 SQLite 连接的上下文管理器"""
    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


def get_db():
    """获取数据库上下文管理器（保持与旧版兼容）"""
    return _FakeConn()


def init_db():
    """初始化数据库 - 创建默认管理员"""
    try:
        result = _col('users').where({'username': 'admin'}).get()
        data = result.get('data', []) if isinstance(result, dict) else []
        if not data:
            pw_hash = hashlib.sha256('admin123'.encode()).hexdigest()
            _col('users').add({
                'username': 'admin',
                'password_hash': pw_hash,
                'display_name': '管理员',
                'role': 'admin',
                'is_active': True,
                'created_at': datetime.now().isoformat()
            })
            print("[CloudBase] 默认管理员创建成功")
    except Exception as e:
        print(f"[CloudBase] init_db error: {e}")


def hash_password(password: str) -> str:
    """密码哈希（保持与旧版一致）"""
    return hashlib.sha256(password.encode()).hexdigest()


# ============ Auth 认证 ============

def create_session(user_id) -> str:
    """创建用户会话"""
    token = str(uuid.uuid4())
    user = get_user_by_id(user_id)
    if not user:
        raise ValueError(f"用户不存在: {user_id}")
    now = datetime.now()
    expires = now + timedelta(hours=24)
    _col('sessions').add({
        'token': token,
        'user_id': str(user_id),
        'username': user.get('username', ''),
        'display_name': user.get('display_name', ''),
        'role': user.get('role', 'user'),
        'is_active': user.get('is_active', True),
        'created_at': now.isoformat(),
        'expires_at': expires.isoformat()
    })
    # 清理过期会话（每次创建时顺带清理）
    try:
        expired = _col('sessions').where({
            'expires_at': _get_db().command.lte(now.isoformat())
        }).get()
        for doc in (expired.get('data', []) if isinstance(expired, dict) else []):
            _col('sessions').doc(doc['_id']).remove()
    except Exception:
        pass
    return token


def get_session_user(token: str):
    """通过 token 获取会话用户信息"""
    result = _col('sessions').where({'token': token}).get()
    data = result.get('data', []) if isinstance(result, dict) else []
    if not data:
        return None
    session = data[0]
    expires_at = session.get('expires_at', '')
    if expires_at and expires_at < datetime.now().isoformat():
        return None
    return {
        'user_id': session.get('user_id', ''),
        'username': session.get('username', ''),
        'display_name': session.get('display_name', ''),
        'role': session.get('role', 'user'),
        'is_active': session.get('is_active', True)
    }


def delete_session(token: str):
    """删除会话"""
    result = _col('sessions').where({'token': token}).get()
    data = result.get('data', []) if isinstance(result, dict) else []
    for doc in data:
        _col('sessions').doc(doc['_id']).remove()


def authenticate(username: str, password: str):
    """用户认证（登录）"""
    pw_hash = hash_password(password)
    result = _col('users').where({
        'username': username,
        'password_hash': pw_hash
    }).get()
    data = result.get('data', []) if isinstance(result, dict) else []
    if not data:
        return None
    u = data[0]
    return {
        'id': u['_id'],
        'username': u.get('username', ''),
        'display_name': u.get('display_name', ''),
        'role': u.get('role', 'user'),
        'is_active': u.get('is_active', True)
    }


# ============ User Management 用户管理 ============

def get_all_users():
    """获取所有用户列表"""
    result = _col('users').orderBy('username', 'asc').limit(500).get()
    data = result.get('data', []) if isinstance(result, dict) else []
    return [{
        'id': u['_id'],
        'username': u.get('username', ''),
        'display_name': u.get('display_name', ''),
        'role': u.get('role', 'user'),
        'is_active': u.get('is_active', True),
        'created_at': u.get('created_at', '')
    } for u in data]


def get_user_by_id(user_id):
    """通过 ID 获取用户"""
    try:
        result = _col('users').doc(str(user_id)).get()
        data = result.get('data', []) if isinstance(result, dict) else []
        if not data:
            # 尝试通过 _id 查询
            r = _col('users').where({'_id': str(user_id)}).limit(1).get()
            data = r.get('data', []) if isinstance(r, dict) else []
        if data:
            u = data[0]
            return {
                'id': u['_id'],
                'username': u.get('username', ''),
                'display_name': u.get('display_name', ''),
                'role': u.get('role', 'user'),
                'is_active': u.get('is_active', True),
                'created_at': u.get('created_at', '')
            }
    except Exception:
        pass
    return None


def create_user(username, password_hash, display_name, role='user'):
    """创建新用户"""
    result = _col('users').add({
        'username': username,
        'password_hash': password_hash,
        'display_name': display_name,
        'role': role,
        'is_active': True,
        'created_at': datetime.now().isoformat()
    })
    doc_id = result.get('id', '') if isinstance(result, dict) else str(result)
    return doc_id


def update_user(user_id, **kwargs):
    """更新用户信息"""
    update_data = {}
    for k, v in kwargs.items():
        if k in ('username', 'display_name', 'role', 'is_active', 'password_hash'):
            update_data[k] = v
    if update_data:
        try:
            _col('users').doc(str(user_id)).update(update_data)
        except Exception as e:
            print(f"[CloudBase] update_user error: {e}")


def delete_user(user_id):
    """删除用户"""
    try:
        _col('users').doc(str(user_id)).remove()
        # 清理关联数据
        _clean_user_associations(str(user_id))
    except Exception as e:
        print(f"[CloudBase] delete_user error: {e}")


def _clean_user_associations(user_id_str):
    """清理用户关联：从所有小组中移除此用户"""
    try:
        result = _col('data_groups').get()
        groups = result.get('data', []) if isinstance(result, dict) else []
        for g in groups:
            members = g.get('member_user_ids', [])
            leaders = g.get('leader_user_ids', [])
            if user_id_str in members or user_id_str in leaders:
                _col('data_groups').doc(g['_id']).update({
                    'member_user_ids': [m for m in members if m != user_id_str],
                    'leader_user_ids': [l for l in leaders if l != user_id_str]
                })
    except Exception as e:
        print(f"[CloudBase] _clean_user_associations error: {e}")


# ============ Group Management 小组管理 ============

def get_all_groups():
    """获取所有小组（含成员数和学员数）"""
    try:
        result = _col('data_groups').orderBy('name', 'asc').limit(500).get()
        groups = result.get('data', []) if isinstance(result, dict) else []
        output = []
        for g in groups:
            gid = g['_id']
            member_count = len(g.get('member_user_ids', []))
            # 统计该小组下的学员数
            try:
                stu_result = _col('students').where({'data_group_id': gid}).count()
                student_count = stu_result.get('total', 0) if isinstance(stu_result, dict) else 0
            except Exception:
                student_count = 0
            output.append({
                'id': gid,
                'name': g.get('name', ''),
                'description': g.get('description', ''),
                'member_count': member_count,
                'student_count': student_count
            })
        return output
    except Exception as e:
        print(f"[CloudBase] get_all_groups error: {e}")
        return []


def create_group(name, description=''):
    """创建小组"""
    result = _col('data_groups').add({
        'name': name,
        'description': description,
        'member_user_ids': [],
        'leader_user_ids': []
    })
    return result.get('id', '') if isinstance(result, dict) else str(result)


def update_group(group_id, **kwargs):
    """更新小组信息"""
    update_data = {}
    for k, v in kwargs.items():
        if k in ('name', 'description'):
            update_data[k] = v
    if update_data:
        try:
            _col('data_groups').doc(str(group_id)).update(update_data)
        except Exception as e:
            print(f"[CloudBase] update_group error: {e}")


def delete_group(group_id):
    """删除小组"""
    try:
        gid = str(group_id)
        _col('data_groups').doc(gid).remove()
        # 清理该小组下的学员
        result = _col('students').where({'data_group_id': gid}).get()
        for s in (result.get('data', []) if isinstance(result, dict) else []):
            _col('students').doc(s['_id']).remove()
    except Exception as e:
        print(f"[CloudBase] delete_group error: {e}")


# ============ User-Group Association 用户小组关联 ============

def get_user_groups(user_id):
    """获取用户所属的小组列表"""
    uid = str(user_id)
    try:
        result = _col('data_groups').get()
        groups = result.get('data', []) if isinstance(result, dict) else []
        return [{
            'id': g['_id'],
            'name': g.get('name', ''),
            'description': g.get('description', '')
        } for g in groups if uid in g.get('member_user_ids', [])]
    except Exception as e:
        print(f"[CloudBase] get_user_groups error: {e}")
        return []


def set_user_groups(user_id, group_ids):
    """设置用户的小组关联"""
    uid = str(user_id)
    try:
        result = _col('data_groups').get()
        groups = result.get('data', []) if isinstance(result, dict) else []
        gid_strs = set(str(gid) for gid in group_ids)
        for g in groups:
            gid = g['_id']
            members = list(g.get('member_user_ids', []))
            if gid in gid_strs:
                if uid not in members:
                    members.append(uid)
            else:
                if uid in members:
                    members.remove(uid)
            _col('data_groups').doc(gid).update({'member_user_ids': members})
    except Exception as e:
        print(f"[CloudBase] set_user_groups error: {e}")


def get_leader_groups(user_id):
    """获取用户作为组长的小组"""
    uid = str(user_id)
    try:
        result = _col('data_groups').get()
        groups = result.get('data', []) if isinstance(result, dict) else []
        return [{
            'id': g['_id'],
            'name': g.get('name', '')
        } for g in groups if uid in g.get('leader_user_ids', [])]
    except Exception as e:
        print(f"[CloudBase] get_leader_groups error: {e}")
        return []


def set_leader_groups(user_id, group_ids):
    """设置用户的组长权限"""
    uid = str(user_id)
    try:
        result = _col('data_groups').get()
        groups = result.get('data', []) if isinstance(result, dict) else []
        gid_strs = set(str(gid) for gid in group_ids)
        for g in groups:
            gid = g['_id']
            leaders = list(g.get('leader_user_ids', []))
            if gid in gid_strs:
                if uid not in leaders:
                    leaders.append(uid)
            else:
                if uid in leaders:
                    leaders.remove(uid)
            _col('data_groups').doc(gid).update({'leader_user_ids': leaders})
    except Exception as e:
        print(f"[CloudBase] set_leader_groups error: {e}")


# ============ Student Management 学员管理 ============

def get_students(page=1, page_size=50, keyword='', group_id=None, user_groups=None):
    """分页获取学员列表"""
    try:
        collection = _col('students')

        # 构建查询
        query = collection

        # 小组过滤
        filter_gids = None
        if group_id:
            filter_gids = [str(group_id)]
        elif user_groups is not None and len(user_groups) > 0:
            filter_gids = [str(g) for g in user_groups]

        # CloudBase 查询限制较多，采用全量拉取 + 本地过滤方式
        result = query.orderBy('created_at', 'desc').limit(1000).get()
        all_students = result.get('data', []) if isinstance(result, dict) else []

        # 本地过滤
        filtered = []
        for s in all_students:
            # 关键字过滤
            if keyword:
                name = s.get('name', '')
                if keyword.lower() not in name.lower():
                    continue
            # 小组过滤
            if filter_gids is not None:
                if s.get('data_group_id', '') not in filter_gids:
                    continue
            filtered.append(s)

        total = len(filtered)

        # 分页
        offset = (page - 1) * page_size
        paged = filtered[offset:offset + page_size]

        # 补充小组名称
        output = []
        for s in paged:
            group_name = ''
            gid = s.get('data_group_id', '')
            if gid:
                try:
                    gr = _col('data_groups').doc(gid).get()
                    gdata = gr.get('data', []) if isinstance(gr, dict) else []
                    if gdata:
                        group_name = gdata[0].get('name', '')
                except Exception:
                    pass
            output.append({
                'id': s.get('_id', ''),
                'name': s.get('name', ''),
                'wechat_group_name': s.get('wechat_group_name', ''),
                'data_group_id': s.get('data_group_id', ''),
                'group_name': group_name,
                'created_at': s.get('created_at', '')
            })

        return output, total
    except Exception as e:
        print(f"[CloudBase] get_students error: {e}")
        return [], 0


def get_student_by_id(student_id):
    """通过 ID 获取学员信息"""
    try:
        sid = str(student_id)
        result = _col('students').doc(sid).get()
        data = result.get('data', []) if isinstance(result, dict) else []
        if data:
            s = data[0]
            group_name = ''
            gid = s.get('data_group_id', '')
            if gid:
                try:
                    gr = _col('data_groups').doc(gid).get()
                    gdata = gr.get('data', []) if isinstance(gr, dict) else []
                    if gdata:
                        group_name = gdata[0].get('name', '')
                except Exception:
                    pass
            return {
                'id': s.get('_id', sid),
                'name': s.get('name', ''),
                'wechat_group_name': s.get('wechat_group_name', ''),
                'data_group_id': s.get('data_group_id', ''),
                'group_name': group_name,
                'created_at': s.get('created_at', '')
            }
    except Exception as e:
        print(f"[CloudBase] get_student_by_id error: {e}")
    return None


def create_student(name, wechat_group_name='', data_group_id=None):
    """创建新学员"""
    sid = str(uuid.uuid4())
    result = _col('students').add({
        '_id': sid,  # 使用自定义 ID
        'name': name,
        'wechat_group_name': wechat_group_name,
        'data_group_id': str(data_group_id) if data_group_id else '',
        'created_at': datetime.now().isoformat()
    })
    return sid


def update_student(student_id, **kwargs):
    """更新学员信息"""
    update_data = {}
    for k, v in kwargs.items():
        if k in ('name', 'wechat_group_name', 'data_group_id'):
            update_data[k] = str(v) if k == 'data_group_id' and v else v
    if update_data:
        try:
            _col('students').doc(str(student_id)).update(update_data)
        except Exception as e:
            print(f"[CloudBase] update_student error: {e}")


def delete_student(student_id):
    """删除学员及其课表记录"""
    sid = str(student_id)
    try:
        _col('students').doc(sid).remove()
        # 删除关联的课表记录
        result = _col('student_records').where({'student_id': sid}).get()
        for r in (result.get('data', []) if isinstance(result, dict) else []):
            _col('student_records').doc(r['_id']).remove()
    except Exception as e:
        print(f"[CloudBase] delete_student error: {e}")


# ============ Student Records 课表记录 ============

def get_student_records(student_id):
    """获取某学员的所有课表记录"""
    try:
        result = _col('student_records').where({
            'student_id': str(student_id)
        }).orderBy('teaching_date', 'desc').limit(500).get()
        records = result.get('data', []) if isinstance(result, dict) else []
        return [{
            'id': r.get('_id', ''),
            'student_id': r.get('student_id', ''),
            'teaching_date': r.get('teaching_date', ''),
            'time_period': r.get('time_period', ''),
            'course_name': r.get('course_name', ''),
            'course_link': r.get('course_link', ''),
            'supervision_script': r.get('supervision_script', ''),
            'supervision_status': r.get('supervision_status', '课前30分钟发送'),
            'wechat_group_name': r.get('wechat_group_name', '')
        } for r in records]
    except Exception as e:
        print(f"[CloudBase] get_student_records error: {e}")
        return []


def add_student_record(student_id, teaching_date, time_period='', course_name='',
                       course_link='', supervision_script='', supervision_status='课前30分钟发送',
                       wechat_group_name=''):
    """添加课表记录"""
    rid = str(uuid.uuid4())
    _col('student_records').add({
        '_id': rid,
        'student_id': str(student_id),
        'teaching_date': teaching_date,
        'time_period': time_period,
        'course_name': course_name,
        'course_link': course_link,
        'supervision_script': supervision_script,
        'supervision_status': supervision_status,
        'wechat_group_name': wechat_group_name
    })
    return rid


def update_student_record(record_id, **kwargs):
    """更新课表记录"""
    update_data = {}
    for k, v in kwargs.items():
        if k in ('teaching_date', 'time_period', 'course_name', 'course_link',
                 'supervision_script', 'supervision_status', 'wechat_group_name'):
            update_data[k] = v
    if update_data:
        try:
            _col('student_records').doc(str(record_id)).update(update_data)
        except Exception as e:
            print(f"[CloudBase] update_student_record error: {e}")


def delete_student_record(record_id):
    """删除课表记录"""
    try:
        _col('student_records').doc(str(record_id)).remove()
    except Exception as e:
        print(f"[CloudBase] delete_student_record error: {e}")


def get_all_records(date_from=None, date_to=None, group_id=None, status=None,
                    user_groups=None, page=1, page_size=50):
    """获取所有课表记录（带筛选和分页）"""
    try:
        result = _col('student_records').orderBy('teaching_date', 'desc').limit(1000).get()
        all_records = result.get('data', []) if isinstance(result, dict) else []

        # 按条件过滤
        filter_gids = None
        if group_id:
            filter_gids = {str(group_id)}
        elif user_groups is not None and len(user_groups) > 0:
            filter_gids = {str(g) for g in user_groups}

        filtered = []
        for r in all_records:
            if date_from and r.get('teaching_date', '') < date_from:
                continue
            if date_to and r.get('teaching_date', '') > date_to:
                continue
            if status and r.get('supervision_status', '') != status:
                continue
            filtered.append(r)

        # 如果需要按 group 过滤，需要查学员信息
        if filter_gids is not None:
            temp = []
            for r in filtered:
                sid = r.get('student_id', '')
                try:
                    stu = _col('students').doc(sid).get()
                    sdata = stu.get('data', []) if isinstance(stu, dict) else []
                    if sdata and sdata[0].get('data_group_id', '') in filter_gids:
                        temp.append(r)
                except Exception:
                    pass
            filtered = temp

        total = len(filtered)
        offset = (page - 1) * page_size
        paged = filtered[offset:offset + page_size]

        # 补充学员名和小组名
        output = []
        for r in paged:
            sid = r.get('student_id', '')
            student_name = ''
            student_group_name = ''
            group_name = ''
            try:
                stu = _col('students').doc(sid).get()
                sdata = stu.get('data', []) if isinstance(stu, dict) else []
                if sdata:
                    s = sdata[0]
                    student_name = s.get('name', '')
                    student_group_name = s.get('wechat_group_name', '')
                    gid = s.get('data_group_id', '')
                    if gid:
                        gr = _col('data_groups').doc(gid).get()
                        gdata = gr.get('data', []) if isinstance(gr, dict) else []
                        if gdata:
                            group_name = gdata[0].get('name', '')
            except Exception:
                pass

            output.append({
                'id': r.get('_id', ''),
                'student_id': sid,
                'teaching_date': r.get('teaching_date', ''),
                'time_period': r.get('time_period', ''),
                'course_name': r.get('course_name', ''),
                'course_link': r.get('course_link', ''),
                'supervision_script': r.get('supervision_script', ''),
                'supervision_status': r.get('supervision_status', ''),
                'wechat_group_name': r.get('wechat_group_name', ''),
                'student_name': student_name,
                'student_group_name': student_group_name,
                'group_name': group_name
            })

        return output, total
    except Exception as e:
        print(f"[CloudBase] get_all_records error: {e}")
        return [], 0


# ============ Send Logs 发送日志 ============

def add_send_log(task_id, group_name, student_name, course_name, success, error_msg='', send_mode=''):
    """添加发送日志"""
    _col('send_logs').add({
        'task_id': task_id,
        'group_name': group_name,
        'student_name': student_name,
        'course_name': course_name,
        'success': bool(success),
        'error_msg': error_msg,
        'send_mode': send_mode,
        'created_at': datetime.now().isoformat()
    })


def get_send_logs(page=1, page_size=50, success_filter=None):
    """分页获取发送日志"""
    try:
        collection = _col('send_logs')
        result = collection.orderBy('created_at', 'desc').limit(1000).get()
        all_logs = result.get('data', []) if isinstance(result, dict) else []

        # 过滤
        if success_filter is not None:
            all_logs = [l for l in all_logs if l.get('success') == bool(success_filter)]

        total = len(all_logs)
        offset = (page - 1) * page_size
        paged = all_logs[offset:offset + page_size]

        return [{
            'id': l.get('_id', ''),
            'task_id': l.get('task_id', ''),
            'group_name': l.get('group_name', ''),
            'student_name': l.get('student_name', ''),
            'course_name': l.get('course_name', ''),
            'success': l.get('success', False),
            'error_msg': l.get('error_msg', ''),
            'send_mode': l.get('send_mode', ''),
            'created_at': l.get('created_at', '')
        } for l in paged], total
    except Exception as e:
        print(f"[CloudBase] get_send_logs error: {e}")
        return [], 0


# ============ Stats 统计 ============

def get_stats(user_groups=None):
    """获取统计数据"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')

        # 学员总数
        result = _col('students').get()
        all_students = result.get('data', []) if isinstance(result, dict) else []
        if user_groups and len(user_groups) > 0:
            gid_strs = {str(g) for g in user_groups}
            student_count = sum(1 for s in all_students
                               if s.get('data_group_id', '') in gid_strs)
        else:
            student_count = len(all_students)

        # 今日课表数
        today_records = 0
        try:
            rec_result = _col('student_records').where({'teaching_date': today}).get()
            today_records = len(rec_result.get('data', []) if isinstance(rec_result, dict) else [])
        except Exception:
            pass

        # 今日已发送
        today_sent = 0
        try:
            log_result = _col('send_logs').where({'success': True}).get()
            logs = log_result.get('data', []) if isinstance(log_result, dict) else []
            today_sent = sum(1 for l in logs
                           if l.get('created_at', '').startswith(today))
        except Exception:
            pass

        pending = max(0, today_records - today_sent)

        return {
            'student_count': student_count,
            'today_records': today_records,
            'today_sent': today_sent,
            'pending_tasks': pending,
        }
    except Exception as e:
        print(f"[CloudBase] get_stats error: {e}")
        return {
            'student_count': 0,
            'today_records': 0,
            'today_sent': 0,
            'pending_tasks': 0,
        }


# ============ Batch Import 批量导入 ============

def import_records_json(records, data_group_id, wechat_group_name='', source_file=''):
    """JSON 格式批量导入课表记录"""
    new_students = 0
    new_records = 0

    for rec in records:
        try:
            student_name = (rec.get('studentName') or '').strip()
            if not student_name:
                continue

            wx_group = (rec.get('groupName') or wechat_group_name or '').strip()
            gid = str(data_group_id) if data_group_id else ''

            # 查找或创建学员
            existing = _col('students').where({
                'name': student_name,
                'data_group_id': gid
            }).limit(1).get()
            existing_data = existing.get('data', []) if isinstance(existing, dict) else []

            if not existing_data:
                sid = str(uuid.uuid4())
                _col('students').add({
                    '_id': sid,
                    'name': student_name,
                    'wechat_group_name': wx_group,
                    'data_group_id': gid,
                    'created_at': datetime.now().isoformat()
                })
                student_id = sid
                new_students += 1
            else:
                student_id = existing_data[0]['_id']
                if wx_group:
                    _col('students').doc(student_id).update({'wechat_group_name': wx_group})

            teaching_date = (rec.get('teachingDate') or '').strip()
            time_period = (rec.get('timePeriod') or '').strip()
            course_name = (rec.get('courseName') or '').strip()
            course_link = (rec.get('courseLink') or '').strip()
            script = (rec.get('supervisionScript') or '').strip()
            status = (rec.get('supervisionStatus') or '课前30分钟发送').strip()

            if not teaching_date:
                continue

            # 去重检查
            dup = _col('student_records').where({
                'student_id': student_id,
                'teaching_date': teaching_date,
                'time_period': time_period,
                'course_name': course_name,
                'supervision_status': status
            }).limit(1).get()
            dup_data = dup.get('data', []) if isinstance(dup, dict) else []

            if not dup_data:
                rid = str(uuid.uuid4())
                _col('student_records').add({
                    '_id': rid,
                    'student_id': student_id,
                    'teaching_date': teaching_date,
                    'time_period': time_period,
                    'course_name': course_name,
                    'course_link': course_link,
                    'supervision_script': script,
                    'supervision_status': status,
                    'wechat_group_name': wx_group
                })
                new_records += 1
        except Exception as e:
            print(f"[CloudBase] import_records_json item error: {e}")
            continue

    return {'new_students': new_students, 'new_records': new_records}


def import_students_and_records(data):
    """批量导入学员和课表记录（从 Excel）"""
    imported = 0
    for row in data:
        try:
            name = row.get('name', '').strip()
            if not name:
                continue

            # 查找或创建小组
            group_name = row.get('group_name', '').strip()
            group_id = ''
            if group_name:
                gr = _col('data_groups').where({'name': group_name}).limit(1).get()
                gr_data = gr.get('data', []) if isinstance(gr, dict) else []
                if gr_data:
                    group_id = gr_data[0]['_id']
                else:
                    result = _col('data_groups').add({
                        'name': group_name,
                        'description': '',
                        'member_user_ids': [],
                        'leader_user_ids': []
                    })
                    group_id = result.get('id', '') if isinstance(result, dict) else str(result)

            # 查找或创建学员
            wechat_group = row.get('wechat_group_name', '').strip()
            student = _col('students').where({
                'name': name,
                'data_group_id': group_id
            }).limit(1).get()
            stu_data = student.get('data', []) if isinstance(student, dict) else []

            if not stu_data:
                sid = str(uuid.uuid4())
                _col('students').add({
                    '_id': sid,
                    'name': name,
                    'wechat_group_name': wechat_group,
                    'data_group_id': group_id,
                    'created_at': datetime.now().isoformat()
                })
                student_id = sid
            else:
                student_id = stu_data[0]['_id']

            teaching_date = row.get('teaching_date', '').strip()
            time_period = row.get('time_period', '').strip()
            course_name = row.get('course_name', '').strip()
            course_link = row.get('course_link', '').strip()
            script = row.get('supervision_script', '').strip()
            status = row.get('supervision_status', '课前30分钟发送').strip()

            if teaching_date:
                # 去重检查
                dup = _col('student_records').where({
                    'student_id': student_id,
                    'teaching_date': teaching_date,
                    'time_period': time_period,
                    'course_name': course_name
                }).limit(1).get()
                dup_data = dup.get('data', []) if isinstance(dup, dict) else []

                if not dup_data:
                    rid = str(uuid.uuid4())
                    _col('student_records').add({
                        '_id': rid,
                        'student_id': student_id,
                        'teaching_date': teaching_date,
                        'time_period': time_period,
                        'course_name': course_name,
                        'course_link': course_link,
                        'supervision_script': script,
                        'supervision_status': status,
                        'wechat_group_name': wechat_group
                    })
                    imported += 1
        except Exception as e:
            print(f"[CloudBase] import_students_and_records item error: {e}")
            continue

    return imported
