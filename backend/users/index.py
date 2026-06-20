"""
Управление пользователями: список, монеты, выдача/снятие админки, покупка товара.
GET  /users               — все пользователи
POST /users body: {action, ...}
  action=coins:  {username, delta}          — изменить монеты
  action=admin:  {username, grant, grantedBy} — выдать/забрать админку
  action=buy:    {username, productId}      — купить товар за монеты
"""
import json
import os
import uuid
import time
import psycopg2

SCHEMA = 't_p51500523_user_profile_pass_sy'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body)}

def row_to_user(row):
    return {'username': row[0], 'isAdmin': row[1], 'adminGrantedBy': row[2], 'coins': row[3]}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    conn = get_conn()
    cur = conn.cursor()

    if method == 'GET':
        cur.execute(f"SELECT username, is_admin, admin_granted_by, coins FROM {SCHEMA}.users ORDER BY username ASC")
        rows = cur.fetchall()
        conn.close()
        return resp(200, [row_to_user(r) for r in rows])

    if method == 'POST':
        data = json.loads(event.get('body') or '{}')
        action = data.get('action')

        if action == 'coins':
            cur.execute(
                f"UPDATE {SCHEMA}.users SET coins = GREATEST(0, coins + %s) WHERE username = %s RETURNING coins",
                (data['delta'], data['username'])
            )
            row = cur.fetchone()
            conn.commit()
            conn.close()
            if not row:
                return resp(404, {'error': 'Пользователь не найден'})
            return resp(200, {'coins': row[0]})

        if action == 'admin':
            grant = data.get('grant', False)
            cur.execute(
                f"UPDATE {SCHEMA}.users SET is_admin = %s, admin_granted_by = %s WHERE username = %s",
                (grant, data.get('grantedBy') if grant else None, data['username'])
            )
            conn.commit()
            conn.close()
            return resp(200, {'ok': True})

        if action == 'buy':
            username = data['username']
            product_id = data['productId']
            cur.execute(f"SELECT id, title, privilege, price, duration_ms FROM {SCHEMA}.products WHERE id = %s", (product_id,))
            prod = cur.fetchone()
            if not prod:
                conn.close()
                return resp(404, {'error': 'Товар не найден'})
            price = prod[3]
            cur.execute(f"SELECT coins FROM {SCHEMA}.users WHERE username = %s", (username,))
            user_row = cur.fetchone()
            if not user_row or user_row[0] < price:
                conn.close()
                return resp(400, {'error': 'Недостаточно 🍪'})
            cur.execute(f"UPDATE {SCHEMA}.users SET coins = coins - %s WHERE username = %s RETURNING coins", (price, username))
            new_coins = cur.fetchone()[0]
            pid = str(uuid.uuid4())
            now = int(time.time() * 1000)
            expires_at = (now + prod[4]) if prod[4] is not None else None
            cur.execute(
                f"INSERT INTO {SCHEMA}.passes (id, owner, title, privilege, created_at, expires_at) VALUES (%s, %s, %s, %s, %s, %s)",
                (pid, username, prod[1], prod[2], now, expires_at)
            )
            conn.commit()
            conn.close()
            return resp(200, {'coins': new_coins, 'pass': {'id': pid, 'owner': username, 'title': prod[1], 'privilege': prod[2], 'createdAt': now, 'expiresAt': expires_at}})

    conn.close()
    return resp(400, {'error': 'Bad request'})
