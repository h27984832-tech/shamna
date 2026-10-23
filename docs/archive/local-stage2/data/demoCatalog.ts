import type { Product } from '../types'

// Samples are intentionally fictional and must remain labeled as demo content.
const productExamples: Product[] = [
  { id: 'sample-1', name: 'صابون غار طبيعي', category: 'عناية', priceSyp: 35000, area: 'جرمانا', storeName: 'بيت الصابون (مثال)', emoji: '🧼', tone: 'sage', description: 'عينة توضيحية لمنتج محلي.' },
  { id: 'sample-2', name: 'طقم فناجين قهوة', category: 'منزل', priceSyp: 85000, area: 'قطنا', storeName: 'دار الحرف (مثال)', emoji: '☕', tone: 'clay', description: 'عينة توضيحية لمنتج حرفي.' },
  { id: 'sample-3', name: 'مربى مشمش بيتي', category: 'مونة', priceSyp: 42000, area: 'جرمانا', storeName: 'مونة الدار (مثال)', emoji: '🍑', tone: 'peach', description: 'عينة توضيحية لمنتج منزلي.' },
  { id: 'sample-4', name: 'وشاح قطني مطرّز', category: 'أزياء', priceSyp: 120000, area: 'قطنا', storeName: 'خيط وحكاية (مثال)', emoji: '🧣', tone: 'rose', description: 'عينة توضيحية لمنتج مصنوع يدويًا.' },
  { id: 'sample-5', name: 'خلطة زعتر بلدي', category: 'مونة', priceSyp: 28000, area: 'قطنا', storeName: 'مونة الدار (مثال)', emoji: '🌿', tone: 'olive', description: 'عينة توضيحية لمنتج محلي.' },
  { id: 'sample-6', name: 'شمعة برائحة الياسمين', category: 'منزل', priceSyp: 55000, area: 'جرمانا', storeName: 'ضو الشام (مثال)', emoji: '🕯️', tone: 'peach', description: 'عينة توضيحية لمنتج يدوي.' },
]

export const demoProducts = productExamples.map((product) => ({ ...product, isDemo: true }))

export const categories = ['الكل', 'مونة', 'منزل', 'أزياء', 'عناية']
export const areas = ['كل المناطق', 'قطنا', 'جرمانا']
