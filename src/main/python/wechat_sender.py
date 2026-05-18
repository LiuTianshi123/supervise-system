"""
企业微信消息发送脚本
用法：python wechat_sender.py --group "群名称" --student "学员姓名" --message "消息内容"

退出码：
  0 = 发送成功
  1 = 群聊未找到
  2 = 发送超时
  3 = 其他异常

stdout最后一行：
  SUCCESS|{timestamp}
  ERROR|{reason}
"""

import argparse
import sys
import time
import traceback
from datetime import datetime

try:
    import pyautogui
    import pyperclip
    import win32gui
    import win32con
except ImportError as e:
    print(f"ERROR|缺少依赖库：{e}，请运行 pip install pyautogui pyperclip pywin32")
    sys.exit(3)


def find_and_activate_wechat():
    """找企业微信窗口并激活"""
    wechat_hwnd = None

    def enum_handler(hwnd, _):
        nonlocal wechat_hwnd
        if win32gui.IsWindowVisible(hwnd):
            title = win32gui.GetWindowText(hwnd)
            if title and "企业微信" in title:
                wechat_hwnd = hwnd
        return True

    win32gui.EnumWindows(enum_handler, None)

    if wechat_hwnd is None:
        return False

    # 恢复并激活窗口
    win32gui.ShowWindow(wechat_hwnd, win32con.SW_RESTORE)
    win32gui.SetForegroundWindow(wechat_hwnd)
    time.sleep(0.8)
    return True


def send_message(group_name: str, student_name: str, message: str) -> bool:
    """
    发送消息到指定群，并@指定学员
    """
    # 激活企业微信
    if not find_and_activate_wechat():
        print("ERROR|未找到企业微信窗口")
        sys.exit(1)

    # Ctrl+F 搜索群聊
    pyautogui.hotkey('ctrl', 'f')
    time.sleep(0.4)

    # 清空搜索框并输入群名
    pyautogui.hotkey('ctrl', 'a')
    pyperclip.copy(group_name)
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.6)

    # 回车进入群聊
    pyautogui.press('enter')
    time.sleep(0.8)

    # 点击消息输入框（点击屏幕下方中间区域）
    screen_w, screen_h = pyautogui.size()
    # 输入框大致在屏幕下方约80%位置
    input_x = screen_w // 2
    input_y = int(screen_h * 0.82)
    pyautogui.click(input_x, input_y)
    time.sleep(0.3)

    # 输入@学员姓名
    pyautogui.typewrite('@', interval=0.05)
    time.sleep(0.3)
    pyperclip.copy(student_name)
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.6)

    # 按回车确认@选择
    pyautogui.press('enter')
    time.sleep(0.4)

    # 粘贴消息正文
    pyperclip.copy(message)
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.3)

    # 按回车发送
    pyautogui.press('enter')
    time.sleep(0.5)

    return True


def main():
    parser = argparse.ArgumentParser(description='企业微信督学消息发送')
    parser.add_argument('--group', required=True, help='群聊名称')
    parser.add_argument('--student', required=True, help='学员姓名')
    parser.add_argument('--message', required=True, help='消息内容')
    args = parser.parse_args()

    try:
        # 设置DPI感知，避免高分辨率屏幕坐标偏移
        try:
            import ctypes
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

        success = send_message(args.group, args.student, args.message)
        if success:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            print(f"SUCCESS|{timestamp}")
            sys.exit(0)
        else:
            print("ERROR|发送失败")
            sys.exit(3)

    except Exception as e:
        error_msg = str(e).replace('\n', ' ')
        print(f"ERROR|{error_msg}")
        traceback.print_exc(file=sys.stderr)
        sys.exit(3)


if __name__ == '__main__':
    main()
