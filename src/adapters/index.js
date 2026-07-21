import uzex from './uzex.js'
import { hayotbirjaAdapters } from './hayotbirja.js'

// Barcha manbalar shu yerda ro'yxatga olinadi.
// YANGI TENDER SAYTI QO'SHISH: yangi adapter fayl yozing (uzex.js ga o'xshab)
// va uni shu massivga qo'shing. Boshqa hech joyni o'zgartirish shart emas.
//
// Hayotbirja bir nechta bo'limdan iborat (Tender, Tanlash, Do'kon, ...) —
// har biri alohida manba sifatida qo'shiladi.
export const adapters = [uzex, ...hayotbirjaAdapters]

export const adapterById = Object.fromEntries(
  adapters.map((a) => [a.id, a])
)
