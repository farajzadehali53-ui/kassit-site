export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/submit" && request.method === "POST") {
      let data;
      try {
        data = await request.json();
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "بدنه درخواست نامعتبر است" }), {
          status: 400,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      }

      const required = ["fullName", "phone", "projectTitle", "description"];
      for (const field of required) {
        if (!data[field] || String(data[field]).trim() === "") {
          return new Response(JSON.stringify({ ok: false, error: `فیلد ${field} الزامی است` }), {
            status: 400,
            headers: { "content-type": "application/json; charset=UTF-8" }
          });
        }
      }

      try {
        await env.DB.prepare(
          `INSERT INTO project_submissions
            (full_name, phone, email, project_title, service_type, readiness, description, quantity, deadline, budget_min, budget_max, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          data.fullName,
          data.phone,
          data.email || null,
          data.projectTitle,
          data.serviceType || null,
          data.readiness || null,
          data.description,
          data.quantity ? Number(data.quantity) : null,
          data.deadline || null,
          data.budgetMin ? Number(data.budgetMin) : null,
          data.budgetMax ? Number(data.budgetMax) : null,
          data.notes || null
        ).run();

        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "خطای سرور، دوباره تلاش کنید" }), {
          status: 500,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
