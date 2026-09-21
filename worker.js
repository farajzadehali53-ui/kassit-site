export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- Public: submit a new project request ---
    if (url.pathname === "/api/submit" && request.method === "POST") {
      let data;
      try {
        data = await request.json();
      } catch (e) {
        return json({ ok: false, error: "بدنه درخواست نامعتبر است" }, 400);
      }

      const required = ["fullName", "phone", "projectTitle", "description"];
      for (const field of required) {
        if (!data[field] || String(data[field]).trim() === "") {
          return json({ ok: false, error: `فیلد ${field} الزامی است` }, 400);
        }
      }

      try {
        await env.DB.prepare(
          `INSERT INTO project_submissions
            (full_name, phone, email, project_title, service_type, readiness, description, quantity, deadline, budget_min, budget_max, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          data.fullName, data.phone, data.email || null, data.projectTitle,
          data.serviceType || null, data.readiness || null, data.description,
          data.quantity ? Number(data.quantity) : null, data.deadline || null,
          data.budgetMin ? Number(data.budgetMin) : null, data.budgetMax ? Number(data.budgetMax) : null,
          data.notes || null
        ).run();
        return json({ ok: true });
      } catch (e) {
        return json({ ok: false, error: "خطای سرور، دوباره تلاش کنید" }, 500);
      }
    }

    // --- Admin: password-gated list of submissions ---
    if (url.pathname === "/api/admin/list" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch (e) { return json({ ok: false, error: "درخواست نامعتبر" }, 400); }
      if (!env.ADMIN_PASSWORD || body.password !== env.ADMIN_PASSWORD) {
        return json({ ok: false, error: "رمز عبور اشتباه است" }, 401);
      }
      const { results } = await env.DB.prepare(
        `SELECT id, full_name, phone, email, project_title, service_type, readiness,
                description, quantity, deadline, budget_min, budget_max, notes, status, created_at
         FROM project_submissions ORDER BY id DESC`
      ).all();
      return json({ ok: true, rows: results });
    }

    if (url.pathname === "/admin") {
      return new Response(ADMIN_HTML, { headers: { "content-type": "text/html; charset=UTF-8" } });
    }

    return env.ASSETS.fetch(request);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=UTF-8" } });
}

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>پنل مدیریت | Kassit Electronic</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0A0E12;color:#E8EDF2;margin:0;padding:20px;}
  h1{font-size:1.2rem;}
  #loginBox{max-width:320px;margin:60px auto;background:#141C26;padding:24px;border-radius:8px;border:1px solid #26313D;}
  input{width:100%;padding:10px;margin:10px 0;background:#0A0E12;border:1px solid #26313D;border-radius:4px;color:#fff;box-sizing:border-box;}
  button{width:100%;padding:10px;background:#C98A4B;border:none;border-radius:4px;color:#1a1006;font-weight:700;cursor:pointer;}
  table{width:100%;border-collapse:collapse;margin-top:20px;font-size:.85rem;}
  th,td{border:1px solid #26313D;padding:8px;text-align:right;vertical-align:top;}
  th{background:#141C26;}
  #err{color:#e08080;margin-top:8px;font-size:.85rem;}
  #tableWrap{overflow-x:auto;}
</style>
</head>
<body>
  <div id="loginBox">
    <h1>ورود به پنل مدیریت</h1>
    <input id="pw" type="password" placeholder="رمز عبور">
    <button onclick="doLogin()">ورود</button>
    <div id="err"></div>
  </div>
  <div id="dataBox" style="display:none;">
    <h1>پروژه‌های ثبت‌شده</h1>
    <div id="tableWrap"></div>
  </div>
<script>
async function doLogin(){
  const pw = document.getElementById('pw').value;
  const res = await fetch('/api/admin/list', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password: pw})});
  const data = await res.json();
  if(!data.ok){ document.getElementById('err').textContent = data.error; return; }
  document.getElementById('loginBox').style.display='none';
  document.getElementById('dataBox').style.display='block';
  render(data.rows);
}
function render(rows){
  if(!rows.length){ document.getElementById('tableWrap').textContent = 'هنوز پروژه‌ای ثبت نشده.'; return; }
  let html = '<table><tr><th>#</th><th>نام</th><th>موبایل</th><th>پروژه</th><th>توضیحات</th><th>بودجه</th><th>وضعیت</th><th>تاریخ</th></tr>';
  for(const r of rows){
    html += '<tr><td>'+r.id+'</td><td>'+esc(r.full_name)+'</td><td>'+esc(r.phone)+'</td><td>'+esc(r.project_title)+'</td><td>'+esc(r.description)+'</td><td>'+(r.budget_min||'-')+' تا '+(r.budget_max||'-')+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.created_at)+'</td></tr>';
  }
  html += '</table>';
  document.getElementById('tableWrap').innerHTML = html;
}
function esc(s){ return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
</script>
</body>
</html>`;
