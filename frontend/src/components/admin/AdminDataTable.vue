<template>
  <table class="admin-data-table">
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          :class="col.class"
        >
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, index) in data" :key="resolveKey(row)">
        <td
          v-for="col in columns"
          :key="col.key"
          :class="col.class"
        >
          <slot
            :name="`cell-${col.key}`"
            :row="row"
            :value="row[col.key]"
            :index="index"
          >
            {{ row[col.key] }}
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  data: {
    type: Array,
    default: () => []
  },
  rowKey: {
    type: [String, Function],
    default: 'id'
  }
})

function resolveKey(row) {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row)
  }
  return row[props.rowKey]
}
</script>

<style scoped>
.admin-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.admin-data-table th,
.admin-data-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px dashed rgba(80, 140, 134, 0.2);
}

.admin-data-table th {
  color: rgb(45, 90, 65);
  font-weight: 600;
  background: rgba(99, 149, 86, 0.08);
}

.admin-data-table tbody tr:hover {
  background: rgba(99, 149, 86, 0.04);
}

.admin-data-table :deep(.text-center) {
  text-align: center;
}
</style>
