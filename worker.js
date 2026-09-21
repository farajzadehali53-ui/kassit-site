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
