import { test, expect } from '@playwright/test'

test.describe('Reports page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports')
    // Wait for quarterly data to render
    await page.waitForSelector('tbody tr')
  })

  test('renders page heading and all three sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Performance Reports', level: 2 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quarterly Performance', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Monthly Revenue Trend', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Month-over-Month Analysis', level: 3 })).toBeVisible()
  })

  test('quarterly table shows all four 2025 quarters', async ({ page }) => {
    const table = page.getByRole('table').first()
    await expect(table.getByRole('cell', { name: 'Q1-2025' })).toBeVisible()
    await expect(table.getByRole('cell', { name: 'Q2-2025' })).toBeVisible()
    await expect(table.getByRole('cell', { name: 'Q3-2025' })).toBeVisible()
    await expect(table.getByRole('cell', { name: 'Q4-2025' })).toBeVisible()
  })

  test('quarterly table has correct column headers', async ({ page }) => {
    const thead = page.getByRole('table').first().getByRole('row').first()
    await expect(thead.getByRole('columnheader', { name: 'Quarter' })).toBeVisible()
    await expect(thead.getByRole('columnheader', { name: 'Total Orders' })).toBeVisible()
    await expect(thead.getByRole('columnheader', { name: 'Total Revenue' })).toBeVisible()
    await expect(thead.getByRole('columnheader', { name: 'Fulfillment Rate' })).toBeVisible()
  })

  test('monthly chart shows 12 month labels', async ({ page }) => {
    const months = ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025',
                    'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025',
                    'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025']
    for (const month of months) {
      await expect(page.locator('.bar-label').filter({ hasText: month }).first()).toBeVisible()
    }
  })

  test('month-over-month table shows growth rates', async ({ page }) => {
    const momTable = page.getByRole('table').nth(1)
    await expect(momTable.getByRole('columnheader', { name: 'Growth Rate' })).toBeVisible()
    // First row has no prior month — should show dash
    const firstDataRow = momTable.getByRole('row').nth(1)
    await expect(firstDataRow).toContainText('-')
    // Second row should have a growth rate percentage
    const secondDataRow = momTable.getByRole('row').nth(2)
    await expect(secondDataRow).toContainText('%')
  })

  test('summary stats cards render with values', async ({ page }) => {
    await expect(page.getByText('Total Revenue (YTD)')).toBeVisible()
    await expect(page.getByText('Avg Monthly Revenue')).toBeVisible()
    await expect(page.getByText('Total Orders (YTD)')).toBeVisible()
    await expect(page.getByText('Best Performing Quarter')).toBeVisible()
    await expect(page.locator('.stat-value').first()).toContainText('$')
  })

  test('warehouse filter reloads quarterly data', async ({ page }) => {
    // Get total orders for Q1 before filtering
    const q1Row = page.getByRole('table').first().getByRole('row').nth(1)
    const before = await q1Row.getByRole('cell').nth(1).textContent()

    // Apply London warehouse filter (subset of all data)
    await page.getByRole('combobox').nth(1).selectOption('London')
    await page.waitForSelector('tbody tr')
    await page.waitForTimeout(300)

    const after = await q1Row.getByRole('cell').nth(1).textContent()
    // London subset should have fewer orders than the global total
    expect(parseInt(after)).toBeLessThan(parseInt(before))
  })
})
