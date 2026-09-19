<script setup lang="ts">
import { computed, ref } from 'vue';

/* https://endtoendtester.com/web-frameworks/vuejs-testing */

const props = withDefaults(
  defineProps<{ sku: string; unitCents: number; quantity?: number; maxQuantity?: number }>(),
  { quantity: 1, maxQuantity: 10 }
);

const emit = defineEmits<{ change: [{ sku: string; quantity: number }] }>();

const raw = ref(String(props.quantity));
const committed = ref(props.quantity);

const error = computed(() => {
  const parsed = Number(raw.value);
  if (raw.value.trim() === '' || !Number.isInteger(parsed) || parsed < 1) {
    return 'Quantity must be at least 1';
  }
  if (parsed > props.maxQuantity) return `Only ${props.maxQuantity} in stock`;
  return null;
});

const total = computed(() => `£${((props.unitCents * committed.value) / 100).toFixed(2)}`);

function enter(next: string) {
  raw.value = next;
  if (error.value === null) {
    committed.value = Number(next);
    emit('change', { sku: props.sku, quantity: committed.value });
  }
}
</script>

<template>
  <div>
    <h3>{{ sku }}</h3>
    <label :for="`qty-${sku}`">Quantity</label>
    <input
      :id="`qty-${sku}`"
      type="number"
      :value="raw"
      @input="enter(($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" role="alert">{{ error }}</p>
    <p data-testid="line-total">{{ total }}</p>
    <button type="button" :disabled="committed >= maxQuantity" @click="enter(String(committed + 1))">
      Add one
    </button>
  </div>
</template>
