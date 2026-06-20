"""
Управление пропусками.
GET  /passes?owner=username — список пропусков пользователя
GET  /passes               — все пропуски (для админа)
POST /passes body: {action, ...}
  action=create: {owner, title, privilege, expiresAt}
  action=update: {id, title, privilege, expiresAt}
  action=delete: {id}
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

def row_to_pass(row):
    return {
        'id': row[0], 'owner': row[1], 'title': row[2],
        'privilege': row[3], 'createdAt': row[4], 'expiresAt': row[5]
    }

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    conn = get_conn()
    cur = conn.cursor()

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        owner = params.get('owner')
        if owner:
            cur.execute(
                f"SELECT id, owner, title, privilege, created_at, expires_at FROM {SCHEMA}.passes WHERE owner = %s ORDER BY created_at DESC",
                (owner,)
            )
        else:
            cur.execute(f"SELECT id, owner, title, privilege, created_at, expires_at FROM {SCHEMA}.passes ORDER BY created_at DESC")
        rows = cur.fetchall()
        conn.close()
        return resp(200, [row_to_pass(r) for r in rows])

    if method == 'POST':
        data = json.loads(event.get('body') or '{}')
        action = data.get('action')

        if action == 'create':
            pid = str(uuid.uuid4())
            now = int(time.time() * 1000)
            cur.execute(
                f"INSERT INTO {SCHEMA}.passes (id, owner, title, privilege, created_at, expires_at) VALUES (%s, %s, %s, %s, %s, %s)",
                (pid, data['owner'], data['title'], data['privilege'], now, data.get('expiresAt'))
            )
            conn.commit()
            conn.close()
            return resp(200, {'id': pid, 'owner': data['owner'], 'title': data['title'], 'privilege': data['privilege'], 'createdAt': now, 'expiresAt': data.get('expiresAt')})

        if action == 'update':
            cur.execute(
                f"UPDATE {SCHEMA}.passes SET title = %s, privilege = %s, expires_at = %s WHERE id = %s",
                (data['title'], data['privilege'], data.get('expiresAt'), data['id'])
            )
            conn.commit()
            conn.close()
            return resp(200, {'ok': True})

        if action == 'delete':
            cur.execute(f"UPDATE {SCHEMA}.passes SET id = id WHERE id = %s", (data['id'],))
            cur.execute(f"DELETE FROM {SCHEMA}.passes WHERE id = %s", (data['id'],))
            conn.commit()
            conn.close()
            return resp(200, {'ok': True})

    conn.close()
    return resp(400, {'error': 'Bad request'})
