<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <!-- Budget input -->
    <div class="budget-bar card">
      <label class="budget-label">{{ t('restocking.budgetCeiling') }}</label>
      <div class="budget-input-group">
        <span class="currency-symbol">$</span>
        <input
          v-model.number="budgetInput"
          type="number"
          min="0"
          step="1000"
          class="budget-input"
          :placeholder="t('restocking.budgetPlaceholder')"
          @change="loadData"
        />
        <button class="btn-apply" @click="loadData">{{ t('restocking.apply') }}</button>
        <button v-if="budgetInput" class="btn-clear" @click="clearBudget">{{ t('restocking.clearBudget') }}</button>
      </div>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <!-- Summary stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">{{ t('restocking.stats.totalItems') }}</div>
          <div class="stat-value">{{ summary.total_items }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t('restocking.stats.totalCost') }}</div>
          <div class="stat-value">${{ formatNumber(summary.total_estimated_cost) }}</div>
        </div>
        <div class="stat-card" :class="{ 'over-budget': budgetInput && summary.total_estimated_cost > budgetInput }">
          <div class="stat-label">{{ t('restocking.stats.withinBudget') }}</div>
          <div class="stat-value">${{ formatNumber(summary.total_within_budget) }}</div>
          <div v-if="budgetInput" class="stat-sub">
            {{ itemsWithinBudget }} / {{ summary.total_items }} {{ t('restocking.stats.items') }}
          </div>
        </div>
        <div class="stat-card critical-card">
          <div class="stat-label">{{ t('restocking.stats.critical') }}</div>
          <div class="stat-value critical-value">{{ criticalCount }}</div>
        </div>
      </div>

      <!-- Recommendations table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.recommendations') }}</h3>
          <div class="legend">
            <span class="legend-item critical">● {{ t('restocking.priority.critical') }}</span>
            <span class="legend-item high">● {{ t('restocking.priority.high') }}</span>
            <span class="legend-item medium">● {{ t('restocking.priority.medium') }}</span>
            <span class="legend-item low">● {{ t('restocking.priority.low') }}</span>
          </div>
        </div>

        <div v-if="recommendations.length === 0" class="empty-state">
          {{ t('restocking.noItems') }}
        </div>

        <div v-else class="table-container">
          <table class="restocking-table">
            <thead>
              <tr>
                <th>{{ t('restocking.table.priority') }}</th>
                <th>{{ t('restocking.table.sku') }}</th>
                <th>{{ t('restocking.table.name') }}</th>
                <th>{{ t('restocking.table.warehouse') }}</th>
                <th>{{ t('restocking.table.onHand') }}</th>
                <th>{{ t('restocking.table.reorderPoint') }}</th>
                <th>{{ t('restocking.table.forecastedDemand') }}</th>
                <th>{{ t('restocking.table.trend') }}</th>
                <th>{{ t('restocking.table.recommendedQty') }}</th>
                <th>{{ t('restocking.table.estimatedCost') }}</th>
                <th v-if="budgetInput">{{ t('restocking.table.budget') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in recommendations"
                :key="index"
                :class="{ 'over-budget-row': budgetInput && !item.within_budget }"
              >
                <td>
                  <span :class="'priority-badge priority-' + item.priority">
                    {{ t('restocking.priority.' + item.priority) }}
                  </span>
                </td>
                <td class="sku-cell">{{ item.sku }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.warehouse }}</td>
                <td :class="{ 'low-stock': item.quantity_on_hand < item.reorder_point }">
                  {{ item.quantity_on_hand }}
                </td>
                <td>{{ item.reorder_point }}</td>
                <td>{{ item.forecasted_demand }}</td>
                <td>
                  <span :class="'trend-' + item.trend">{{ t('trends.' + item.trend) }}</span>
                </td>
                <td class="qty-cell"><strong>{{ item.recommended_qty }}</strong></td>
                <td class="cost-cell">${{ formatNumber(item.estimated_cost) }}</td>
                <td v-if="budgetInput">
                  <span :class="item.within_budget ? 'within-budget' : 'over-budget-badge'">
                    {{ item.within_budget ? '✓' : '✗' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useFilters } from '../composables/useFilters'
import { api } from '../api'

export default {
  name: 'Restocking',
  setup() {
    const { t } = useI18n()
    const { getCurrentFilters, selectedLocation, selectedCategory } = useFilters()

    const loading = ref(true)
    const error = ref(null)
    const recommendations = ref([])
    const summary = ref({ total_items: 0, total_estimated_cost: 0, total_within_budget: 0, budget_ceiling: null })
    const budgetInput = ref(null)

    const criticalCount = computed(() =>
      recommendations.value.filter(r => r.priority === 'critical').length
    )

    const itemsWithinBudget = computed(() =>
      recommendations.value.filter(r => r.within_budget).length
    )

    async function loadData() {
      try {
        loading.value = true
        error.value = null
        const filters = getCurrentFilters()
        const result = await api.getRestockingRecommendations({
          warehouse: filters.warehouse,
          category: filters.category,
          budget: budgetInput.value
        })
        recommendations.value = result.recommendations
        summary.value = result.summary
      } catch (err) {
        console.error('Failed to load restocking data:', err)
        error.value = 'Failed to load restocking recommendations: ' + err.message
      } finally {
        loading.value = false
      }
    }

    function clearBudget() {
      budgetInput.value = null
      loadData()
    }

    function formatNumber(num) {
      if (!Number.isFinite(num)) return '0.00'
      const abs = Math.abs(num)
      const parts = abs.toFixed(2).split('.')
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return (num < 0 ? '-' : '') + intPart + '.' + parts[1]
    }

    onMounted(loadData)
    watch([selectedLocation, selectedCategory], loadData)

    return {
      t,
      loading,
      error,
      recommendations,
      summary,
      budgetInput,
      criticalCount,
      itemsWithinBudget,
      loadData,
      clearBudget,
      formatNumber
    }
  }
}
</script>

<style scoped>
.restocking {
  padding: 0;
}

.budget-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.budget-label {
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
}

.budget-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.currency-symbol {
  font-size: 1.1rem;
  color: #64748b;
  font-weight: 600;
}

.budget-input {
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  width: 180px;
  outline: none;
  transition: border-color 0.15s;
}

.budget-input:focus {
  border-color: #3b82f6;
}

.btn-apply {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-apply:hover { background: #2563eb; }

.btn-clear {
  background: none;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-clear:hover { border-color: #94a3b8; color: #0f172a; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border-left: 4px solid #3b82f6;
}

.stat-card.over-budget { border-left-color: #f59e0b; }
.stat-card.critical-card { border-left-color: #ef4444; }

.stat-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.4rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
}

.critical-value { color: #ef4444; }

.stat-sub {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.legend {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
}

.legend-item { font-weight: 500; }
.legend-item.critical { color: #ef4444; }
.legend-item.high { color: #f97316; }
.legend-item.medium { color: #f59e0b; }
.legend-item.low { color: #22c55e; }

.restocking-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.restocking-table th {
  background: #f8fafc;
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #64748b;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}

.restocking-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.restocking-table tr:hover td { background: #f8fafc; }

.over-budget-row td { opacity: 0.5; }

.priority-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.priority-critical { background: #fee2e2; color: #991b1b; }
.priority-high     { background: #ffedd5; color: #9a3412; }
.priority-medium   { background: #fef3c7; color: #92400e; }
.priority-low      { background: #dcfce7; color: #166534; }

.sku-cell {
  font-family: monospace;
  font-size: 0.8rem;
  color: #3b82f6;
}

.low-stock { color: #ef4444; font-weight: 600; }

.trend-increasing { color: #ef4444; font-weight: 500; }
.trend-stable     { color: #64748b; }
.trend-decreasing { color: #22c55e; font-weight: 500; }

.qty-cell { font-size: 1rem; color: #0f172a; }
.cost-cell { font-weight: 600; color: #0f172a; }

.within-budget { color: #16a34a; font-weight: 700; font-size: 1rem; }
.over-budget-badge { color: #dc2626; font-weight: 700; font-size: 1rem; }

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
  font-size: 0.95rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

.error {
  background: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}
</style>
