import { superValidate } from "sveltekit-superforms";
import type { PageServerLoad } from "../$types";
import { zod4 } from "sveltekit-superforms/adapters";
import { createBillSchema } from "$lib/schemas/bill.schema";
import { API_URL } from "$env/static/private";
import { setFlash } from "sveltekit-flash-message/server";
import { $t } from "$lib/i18n";
import { fail, type Actions } from "@sveltejs/kit";
import { createCategorySchema } from "$lib/schemas/category.schema";
import { addCategoryAction } from "$lib/server/actions/category";

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
  // Load accounts from the API
  let accounts = [];
  try {
    const response = await fetch(`${API_URL}/accounts`);
    if (!response.ok) {
      throw new Error('Failed to load accounts');
    }
    accounts = await response.json();
  } catch {
    setFlash({ type: 'error', message: $t('accounts.loadAccountsError') }, cookies);
  }

  // load categories from the API
  let categories = [];
  try {
    const response = await fetch(`${API_URL}/categories`);
    if (!response.ok) {
      throw new Error('Failed to load categories');
    }
    categories = await response.json();
  } catch {
    setFlash({ type: 'error', message: $t('categories.loadCategoriesError') }, cookies);
  }

  // Parse month from URL query parameter (format: YYYY-MM) or use current month
  const monthParam = url.searchParams.get('month');
  let targetDate: Date;
  
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split('-').map(Number);
    targetDate = new Date(year, month - 1, 1);
  } else {
    targetDate = new Date();
  }

  // load bills from the API for the selected month
  let bills = [];
  const dateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString().split('T')[0];
  const dateEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).toISOString().split('T')[0];

  try {
    const response = await fetch(`${API_URL}/bills?dateStart=${dateStart}&dateEnd=${dateEnd}`);
    if (!response.ok) {
      throw new Error('Failed to load bills');
    }
    bills = await response.json();
  } catch {
    setFlash({ type: 'error', message: $t('bills.loadBillsError') }, cookies);
  }

  // Return the current selected month for the UI
  const selectedMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

  return {
    createBillForm: await superValidate(zod4(createBillSchema)),
    createCategoryForm: await superValidate(zod4(createCategorySchema)),
    accounts,
    bills,
    categories,
    selectedMonth
  }
}

export const actions: Actions = {
  addCategory: async (event) => addCategoryAction(event),
  addBill: async ({ request, cookies, fetch }) => {
    const form = await superValidate(request, zod4(createBillSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const isEditing = Boolean(form.data.id && form.data.targetDate);
    try {
      const response = await fetch(`${API_URL}/bills${isEditing ? `/${form.data.id}/${form.data.targetDate}` : ''}`, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form.data)
      });

      if (!response.ok) {
        const { message, statusCode } = await response.json();
        setFlash({ type: 'error', message }, cookies);
        return fail(statusCode, { form });
      }

      const message = isEditing ? $t('bills.editBillSuccess') : $t('bills.addBillSuccess');
      setFlash({ type: 'success', message }, cookies);
      return { form };
    } catch {
      const message = isEditing ? $t('bills.editBillError') : $t('bills.addBillError');
      setFlash({ type: 'error', message }, cookies);
      return fail(500, { form })
    }
  }
}
