# Tender Aggregator

Bir nechta e-tender platformasidan (UZEX, Hayotbirja, ...) tenderlarni yig'ib,
bitta oynada ko'rsatuvchi Vue 3 ilova.

## Ishga tushirish

```bash
npm install
cp .env.example .env      # UZEX validation tokenini kiriting
npm run dev               # http://localhost:5173
```

## ⚠️ Eng muhim narsa — CORS va tokenlar

Tender API'lariga brauzerdan **to'g'ridan-to'g'ri** so'rov yuborib bo'lmaydi. Sabablari:

1. **CORS** — API'lar `origin`/`referer` ni tekshiradi. Brauzer boshqa domendan
   so'rovni bloklaydi.
2. **UZEX `validation` header** — bu token UZEX frontendida generatsiya qilinadi
   va eskiradi. Uni DevTools'dan olib `.env` ga qo'yish kerak.
3. **Hayotbirja `x-idempotency-key` / cookie** — har so'rovda kerak.

**Yechim ikki bosqichli:**

- **Dev rejimida** — `vite.config.js` dagi proxy ishlatiladi. Vite so'rovni server
  tomonda qayta jo'natadi va `origin` header'ni to'g'rilaydi. Bu CORS ni yechadi.
- **Prod rejimida** — o'zingizning backend proxy'ingiz kerak (Spring Boot ideal).
  U API'ga so'rov yuboradi, tokenlarni saqlaydi/yangilaydi va frontendga toza
  JSON qaytaradi. `src/adapters/*.js` da prod `BASE` ni shu proxy manziliga
  o'zgartiring.

> Backend proxy'siz bu ilova faqat dev rejimida (Vite proxy bilan) ishlaydi.

## Yangi tender sayti qo'shish

3 qadam, boshqa hech narsani o'zgartirmaysiz:

1. `src/adapters/` da yangi fayl yozing (`uzex.js` ni namuna qiling). Uning
   `fetchTenders()` metodi API javobini `createTender({...})` orqali umumiy
   modelga aylantirsin.
2. Kerak bo'lsa `vite.config.js` ga o'sha sayt uchun proxy qo'shing.
3. `src/adapters/index.js` dagi `adapters` massiviga qo'shing.

Tayyor — UI avtomatik ravishda yangi manbani ko'rsatadi (holat, filtr, qidiruv).

## Tuzilma

```
src/
  adapters/          # har bir sayt = bitta adapter
    base.js          # umumiy Tender modeli + yordamchilar
    uzex.js
    hayotbirja.js
    index.js         # ro'yxat (shu yerga qo'shiladi)
  composables/
    useTenders.js    # barcha manbalarni parallel yuklaydi, birlashtiradi
  components/
    TenderCard.vue
  App.vue
```

## Diqqat: Hayotbirja metodi

Siz bergan curl'dagi `ref_area` — bu hududlar spravochnigi, tender ro'yxati emas.
Tender ro'yxatining aniq JSON-RPC metodini DevTools'dan topib,
`src/adapters/hayotbirja.js` dagi `TENDER_LIST_METHOD` ni almashtiring.
# tender-agregator
