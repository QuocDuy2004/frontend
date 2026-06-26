import os
import re
import json
import time
import random
import requests
from datetime import datetime

API_URL = "https://smmkay.com/api/adminv1"
API_KEY = "37420810974b3ad84d2b7392a57ef498"
SERVICE_ID = "1944"

BOT_TOKEN = "8907275133:AAGgtMDBp6jUCPPMNO87s0xrnKxGsP7r-N8"
CHAT_ID = "8409353479"

TDS_UID_API = "https://id.traodoisub.com/api.php"

ORDERS_FILE = "orders.json"

CHECK_NEW_ORDER_INTERVAL = 10
CHECK_PROGRESS_INTERVAL = 120

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/134.0.0.0 Safari/537.36",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Dest": "document",
}


def now_text():
    return datetime.now().strftime("%d/%m/%Y %H:%M:%S")


def load_orders_file():
    if not os.path.exists(ORDERS_FILE):
        return []

    try:
        with open(ORDERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def save_orders_file(orders):
    with open(ORDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(orders, f, ensure_ascii=False, indent=4)


def is_number_uid(value):
    return str(value).strip().isdigit()


def remove_order_from_file(order_id):
    orders = load_orders_file()
    orders = [
        order for order in orders
        if str(order.get("id")) != str(order_id)
    ]
    save_orders_file(orders)


def get_pending_orders():
    payload = {
        "key": API_KEY,
        "action": "listOrder",
        "service": SERVICE_ID,
        "status": "Pending",
    }

    response = requests.post(API_URL, data=payload, timeout=30)
    response.raise_for_status()

    data = response.json()

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        if isinstance(data.get("data"), list):
            return data["data"]
        if isinstance(data.get("orders"), list):
            return data["orders"]

    return []


def set_order_status(order_id, status):
    payload = {
        "key": API_KEY,
        "action": "setStatus",
        "id": order_id,
        "status": status,
    }

    try:
        response = requests.post(API_URL, data=payload, timeout=30)
        response.raise_for_status()
        print(f"✅ setStatus order {order_id} => {status}")
        print(response.text)
        return True
    except Exception as e:
        print(f"⚠️ Lỗi setStatus order {order_id}: {e}")
        return False


def set_start_count(order_id, start_count):
    payload = {
        "key": API_KEY,
        "action": "setStartCount",
        "id": order_id,
        "start_count": start_count,
    }

    try:
        response = requests.post(API_URL, data=payload, timeout=30)
        response.raise_for_status()
        print(f"✅ setStartCount order {order_id}: {start_count}")
        print(response.text)
        return True
    except Exception as e:
        print(f"⚠️ Lỗi setStartCount order {order_id}: {e}")
        return False


def get_facebook_uid(link):
    link = str(link).strip()

    if is_number_uid(link):
        return {
            "uid": link,
            "name": "UID có sẵn",
            "share_type": "number",
        }

    for attempt in range(1, 4):
        try:
            response = requests.post(
                TDS_UID_API,
                data={"link": link},
                timeout=15,
            )
            response.raise_for_status()

            data = response.json()
            uid = str(data.get("id", "")).strip()

            if data.get("success") == 200 and uid.isdigit():
                return {
                    "uid": uid,
                    "name": data.get("name", "Không xác định"),
                    "share_type": data.get("share_type"),
                }

        except Exception as e:
            print(f"⚠️ Lỗi get UID lần {attempt}: {e}")

        if attempt < 3:
            time.sleep(5)

    return None


def parse_reduced_count(text):
    if not text:
        return 0

    text = str(text).strip().upper().replace(" ", "")

    if "," in text and "." not in text:
        text = text.replace(",", ".")
    else:
        text = text.replace(",", "")

    match = re.search(r"(\d+(?:\.\d+)?)([KM])?", text)

    if not match:
        return int(text) if text.isdigit() else 0

    num = float(match.group(1))
    unit = match.group(2)

    if unit == "K":
        num *= 1000
    elif unit == "M":
        num *= 1_000_000

    return int(num)


def get_share_count(full_url, max_retries=8):
    if not full_url:
        return None

    full_url = str(full_url).strip()

    if is_number_uid(full_url):
        return 0

    for attempt in range(1, max_retries + 1):
        try:
            headers = HEADERS.copy()
            headers["Referer"] = full_url

            response = requests.get(
                full_url,
                headers=headers,
                timeout=15,
                allow_redirects=True,
            )
            response.raise_for_status()

            html = response.text

            bloks_counts = re.findall(
                r'\(bk\.action\.string\.Replace,\s*"[^"]*count[^"]*",\s*"[^"]*count[^"]*",\s*"([^"]+)",\s*true\)',
                html,
            )
            if bloks_counts:
                parsed = [parse_reduced_count(x) for x in bloks_counts]
                parsed = [x for x in parsed if x >= 0]
                if parsed:
                    return max(parsed)

            match = re.search(r'"share_count":\s*\{\s*"count":\s*(\d+)', html)
            if match:
                return int(match.group(1))

            match = re.search(r'"i18n_share_count":\s*"(\d+)"', html)
            if match:
                return int(match.group(1))

            match = re.search(r'"share_count_reduced":\s*"([^"]+)"', html)
            if match:
                return parse_reduced_count(match.group(1))

            match = re.search(
                r'"feedback":\{[^}]*"share_count_reduced":\s*"([^"]+)"',
                html,
                re.DOTALL,
            )
            if match:
                return parse_reduced_count(match.group(1))

        except Exception as e:
            print(f"❌ Lỗi get share count lần {attempt}: {str(e)[:120]}")

        if attempt < max_retries:
            time.sleep(random.uniform(2.0, 4.5))

    return None


def send_telegram(text):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

    payload = {
        "chat_id": CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    response = requests.post(url, data=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def build_new_order_message(order):
    return (
        f"📦 <b>ĐƠN HÀNG MỚI</b>\n"
        f"🕒 {now_text()}\n"
        f"━━━━━━━━━━━━━━━\n"
        f"🆔 Order ID: <code>{order.get('id')}</code>\n"
        f"🔑 UID: <code>{order.get('uid')}</code>\n"
        f"🔗 Link/Input: {order.get('link')}\n"
        f"🔁 StartCount: <b>{order.get('start_count')}</b>\n"
        f"📈 Quantity: <b>{order.get('quantity')}</b>\n"
        f"🎯 Target: <b>{order.get('target_count')}</b>\n"
    )


def build_completed_message(order, current_share):
    return (
        f"✅ <b>ĐƠN HÀNG COMPLETED</b>\n"
        f"🕒 {now_text()}\n"
        f"━━━━━━━━━━━━━━━\n"
        f"🆔 Order ID: <code>{order.get('id')}</code>\n"
        f"🔑 UID: <code>{order.get('uid')}</code>\n"
        f"🔁 Share hiện tại: <b>{current_share}</b>\n"
        f"🚀 StartCount: <b>{order.get('start_count')}</b>\n"
        f"📈 Quantity: <b>{order.get('quantity')}</b>\n"
        f"🎯 Target: <b>{order.get('target_count')}</b>\n"
    )


def sync_new_orders_to_file():
    api_orders = get_pending_orders()
    local_orders = load_orders_file()

    local_ids = {
        str(order.get("id"))
        for order in local_orders
        if isinstance(order, dict)
    }

    changed = False

    for api_order in api_orders:
        if not isinstance(api_order, dict):
            continue

        order_id = api_order.get("id")
        link = api_order.get("link")
        quantity = int(api_order.get("quantity", 0) or 0)

        if not order_id or not link:
            continue

        if str(order_id) in local_ids:
            continue

        fb_info = get_facebook_uid(link)

        if not fb_info:
            print(f"❌ Không lấy được UID order {order_id}, chuyển Canceled")
            set_order_status(order_id, "Canceled")
            continue

        share_count = get_share_count(link)
        if share_count is None:
            share_count = 0

        set_start_ok = set_start_count(order_id, share_count)

        new_order = {
            "id": order_id,
            "link": link,
            "quantity": quantity,
            "start_count": share_count,
            "target_count": share_count + quantity,
            "uid": fb_info.get("uid"),
            "telegram_sent": True,
            "set_start_count_ok": set_start_ok,
            "status": "Tracking",
            "created_at": now_text(),
            "last_check_at": now_text(),
            "last_share_count": share_count,
        }

        local_orders.append(new_order)
        local_ids.add(str(order_id))
        changed = True

        send_telegram(build_new_order_message(new_order))
        print(f"✅ Đã gửi Telegram và giữ order {order_id} trong orders.json")

    if changed:
        save_orders_file(local_orders)


def check_tracking_orders():
    orders = load_orders_file()

    if not orders:
        print("⏳ Không có đơn đang theo dõi.")
        return

    remaining_orders = []
    changed = False

    for order in orders:
        if not isinstance(order, dict):
            continue

        order_id = order.get("id")
        link = order.get("link")

        start_count = int(order.get("start_count", 0) or 0)
        quantity = int(order.get("quantity", 0) or 0)
        target_count = int(order.get("target_count", start_count + quantity) or 0)

        current_share = get_share_count(link)

        if current_share is None:
            print(f"⚠️ Không lấy được share hiện tại order {order_id}, giữ lại.")
            remaining_orders.append(order)
            continue

        order["last_share_count"] = current_share
        order["last_check_at"] = now_text()
        changed = True

        print(
            f"🔎 Order {order_id}: "
            f"current={current_share}, start={start_count}, "
            f"quantity={quantity}, target={target_count}"
        )

        if current_share >= target_count:
            ok = set_order_status(order_id, "Completed")

            if ok:
                send_telegram(build_completed_message(order, current_share))
                print(f"✅ Order {order_id} đã Completed, xóa khỏi orders.json")
                changed = True
                continue

        remaining_orders.append(order)

    if changed:
        save_orders_file(remaining_orders)


def main():
    print("🚀 Bot đang chạy...")
    print(f"🔄 Check đơn mới mỗi {CHECK_NEW_ORDER_INTERVAL} giây")
    print(f"📊 Check tiến độ mỗi {CHECK_PROGRESS_INTERVAL} giây")

    last_progress_check = 0

    while True:
        try:
            sync_new_orders_to_file()

            current_time = time.time()
            if current_time - last_progress_check >= CHECK_PROGRESS_INTERVAL:
                check_tracking_orders()
                last_progress_check = current_time

        except Exception as e:
            print(f"⚠️ Lỗi vòng lặp chính: {e}")

        time.sleep(CHECK_NEW_ORDER_INTERVAL)


if __name__ == "__main__":
    main()