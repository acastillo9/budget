import { API_URL } from "$env/static/private";
import { setFlash } from "sveltekit-flash-message/server";
import type { PageServerLoad } from "../$types";
import { $t } from "$lib/i18n";
import { fail, type Actions } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { createCategorySchema } from "$lib/schemas/category.schema";
import { createTransactionSchema, createTransferSchema } from "$lib/schemas/transaction.schema";
import { addCategoryAction } from "$lib/server/actions/category";

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
  const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset') as string, 10) : 0;

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

  // load transactions from the API
  const transactions = {
    data: [],
    total: 0,
    limit: 10,
    offset,
    nextPage: null,
  }
  try {
    const response = await fetch(`${API_URL}/transactions${transactions.offset ? `?offset=${transactions.offset}` : ''}`)
    if (!response.ok) {
      throw new Error('Failed to load transactions');
    }
    // fetch the transactions from the API and parsing the date fields on the
    // result from string to date
    const { data, total, limit, offset, nextPage } = await response.json();
    transactions.data = data;
    transactions.total = total;
    transactions.limit = limit;
    transactions.offset = offset;
    transactions.nextPage = nextPage;
  } catch {
    setFlash({ type: 'error', message: $t('transactions.loadTransactionsError') }, cookies);
  }

  return {
    createCategoryForm: await superValidate(zod4(createCategorySchema)),
    addTransactionForm: await superValidate(zod4(createTransactionSchema)),
    addTransferForm: await superValidate(zod4(createTransferSchema)),
    transactions: transactions,
    accounts,
    categories
  }
}


export const actions: Actions = {
  addCategory: async (event) => addCategoryAction(event),
  addTransaction: async ({ request, cookies, fetch }) => {
    const form = await superValidate(request, zod4(createTransactionSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const isEditing = Boolean(form.data.id);
    try {
      const response = await fetch(`${API_URL}/transactions${isEditing ? `/${form.data.id}` : ''}`, {
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

      const message = isEditing ? $t('transactions.editTransactionSuccess') : $t('transactions.addTransactionSuccess');
      setFlash({ type: 'success', message }, cookies);
      return { form };
    } catch {
      const message = isEditing ? $t('transactions.editTransactionError') : $t('transactions.addTransactionError');
      setFlash({ type: 'error', message }, cookies);
      return fail(500, { form });
    }
  },
  addTransfer: async ({ request, cookies, fetch }) => {
    const form = await superValidate(request, zod4(createTransferSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const isEditing = Boolean(form.data.id);
    try {
      const response = await fetch(`${API_URL}/transactions/transfer${isEditing ? `/${form.data.id}` : ''}`, {
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

      const message = isEditing ? $t('transactions.editTransactionSuccess') : $t('transactions.addTransactionSuccess');
      setFlash({ type: 'success', message }, cookies);
      return { form };
    } catch {
      const message = isEditing ? $t('transactions.editTransactionError') : $t('transactions.addTransactionError');
      setFlash({ type: 'error', message }, cookies);
      return fail(500, { form });
    }
  }
}
