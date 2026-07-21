import uzex from './uzex.js'
import hayotbirja from './hayotbirja.js'

// Barcha manbalar shu yerda ro'yxatga olinadi.
// YANGI TENDER SAYTI QO'SHISH: yangi adapter fayl yozing (uzex.js ga o'xshab)
// va uni shu massivga qo'shing. Boshqa hech joyni o'zgartirish shart emas.
export const adapters = [uzex, hayotbirja]

export const adapterById = Object.fromEntries(
  adapters.map((a) => [a.id, a])
)
