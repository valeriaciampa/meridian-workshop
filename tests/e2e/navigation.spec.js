import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('renders app header and all nav links', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Catalyst Components' })).toBeVisible()
    const nav = page.getByRole('navigation')
    await expect(nav.getByRole('link', { name: 'Overview' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Inventory' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Orders' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Finance' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Demand Forecast' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Reports' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Restocking' })).toBeVisible()
  })

  test('navigates to each page without errors', async ({ page }) => {
    const routes = [
      { path: '/inventory', heading: 'Inventory' },
      { path: '/orders', heading: 'Orders' },
      { path: '/demand', heading: 'Demand Forecast' },
      { path: '/reports', heading: 'Performance Reports' },
      { path: '/restocking', heading: 'Restocking Recommendations' }
    ]
    for (const { path, heading } of routes) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible()
    }
  })

  test('filter bar is present on every page', async ({ page }) => {
    const routes = ['/', '/inventory', '/orders', '/reports', '/restocking']
    for (const path of routes) {
      await page.goto(path)
      await expect(page.getByRole('combobox').first()).toBeVisible()
    }
  })
})
