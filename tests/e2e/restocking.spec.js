import { test, expect } from '@playwright/test'

test.describe('Restocking page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/restocking')
    await page.waitForSelector('tbody tr')
  })

  test('renders heading, description and budget input', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Restocking Recommendations', level: 2 })).toBeVisible()
    await expect(page.getByText('Purchase order recommendations based on stock levels')).toBeVisible()
    await expect(page.getByText('Budget Ceiling')).toBeVisible()
    await expect(page.getByRole('spinbutton')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible()
  })

  test('shows summary stat cards', async ({ page }) => {
    await expect(page.getByText('Items to Restock')).toBeVisible()
    await expect(page.getByText('Total Estimated Cost')).toBeVisible()
    await expect(page.getByText('Within Budget')).toBeVisible()
    await expect(page.getByText('Critical Items')).toBeVisible()
  })

  test('renders recommendations table with correct columns', async ({ page }) => {
    const thead = page.getByRole('table').getByRole('row').first()
    await expect(thead.getByRole('columnheader', { name: 'Priority' })).toBeVisible()
    await expect(thead.getByRole('columnheader', { name: 'SKU' })).toBeVisible()
    await expect(thead.getByRole('columnheader', { name: 'Item' })).toBeVisible()
    await expect(thead.getByRole('columnheader', { name: 'Warehouse' })).toBeVisible()
    await expect(thead.getByRole('columnheader', { name: 'On Hand' })).toBeVisible()
    await expect(thead.getByRole('columnheader', { name: 'Rec. Qty' })).toBeVisible()
    await expect(thead.getByRole('columnheader', { name: 'Est. Cost' })).toBeVisible()
  })

  test('recommendations show priority badges', async ({ page }) => {
    const badges = page.locator('.priority-badge')
    await expect(badges.first()).toBeVisible()
    expect(await badges.count()).toBeGreaterThan(0)
  })

  test('budget ceiling adds Budget column and marks over-budget rows', async ({ page }) => {
    const allCount = await page.locator('tbody tr').count()

    // Enter a budget smaller than the total estimated cost
    await page.getByRole('spinbutton').fill('1000')
    await page.getByRole('button', { name: 'Apply' }).click()
    await page.waitForTimeout(400)

    // Budget column header should appear
    const thead = page.getByRole('table').getByRole('row').first()
    await expect(thead.getByRole('columnheader', { name: 'Budget' })).toBeVisible()

    // Over-budget rows should be greyed out
    const overBudget = page.locator('.over-budget-row')
    expect(await overBudget.count()).toBeGreaterThan(0)

    // Clear budget — Budget column disappears
    await page.getByRole('button', { name: 'Clear' }).click()
    await page.waitForTimeout(400)
    await expect(thead.getByRole('columnheader', { name: 'Budget' })).not.toBeVisible()

    expect(await page.locator('tbody tr').count()).toBe(allCount)
  })

  test('warehouse filter reloads and scopes recommendations', async ({ page }) => {
    const allCount = await page.locator('tbody tr').count()

    await page.getByRole('combobox').nth(1).selectOption('San Francisco')
    await page.waitForTimeout(500)

    const filteredCount = await page.locator('tbody tr').count()
    // SF results should be a subset (≤ all results)
    expect(filteredCount).toBeLessThanOrEqual(allCount)
  })

  test('est. cost values are formatted with dollar sign', async ({ page }) => {
    const first = await page.locator('.cost-cell').first().textContent()
    expect(first).toMatch(/^\$[\d,]+\.\d{2}$/)
  })
})
