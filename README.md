# Extinction — Piksel Portre Stüdyosu

Bir görsel ve kalan birey sayısı verirsiniz; uygulama o görseli **tam o sayıda
pikselden** oluşan bir portreye çevirir, seçtiklerinizi galeriye dizer ve tam
ekran bir sunuma dönüştürür.

Fikrin kaynağı WWF Japonya'nın 2008 tarihli *Population by Pixel* kampanyası
(Hakuhodo C&D Tokyo): afişteki piksel sayısı, o türden doğada kalan birey
sayısına eşitti. Bu depo o kampanya değil, o denklemden ilham alan bağımsız
bir araç; WWF ya da ajansla bir ilişkisi yoktur.

## Neler var

| Rota | İş |
| --- | --- |
| `/` | Manifesto: koridor akışı, kalan sayı şeridi ve kaydırdıkça piksel sayısı düşen "yok oluş" bölümü |
| `/studio` | Yükleme, pikselleştirme ve künye paneli |
| `/gallery` | Yayındaki + yerel eserler, sunum seçimi, büyütme, yayınlama/kaldırma |
| `/present` | Açılış + eser + kapanış slaytlarından oluşan tam ekran sunum |

## Galeri nerede duruyor

Site statik, bu yüzden **depo veri tabanıdır**: yayındaki eserler depodaki
dosyalardır ve *yayınlamak bir commit atmaktır*.

```
public/content/works.json        # künye listesi (herkesin gördüğü galeri)
public/content/works/<id>.webp   # poster
public/content/sources/<id>.png  # kaynak görsel
```

- **Ziyaretçi** `works.json`'ı okur; hangi cihazdan bakarsa baksın aynı
  galeriyi görür. Hesap, giriş, istek yok.
- **Yönetici** girişi bir GitHub token'ıdır: yalnızca bu depo için
  *Contents: read and write* izni olan ince ayarlı (fine-grained) bir token.
  Depoya commit atabilen kişi galeriye de yayınlayabilir — ikisi aynı yetki.
  Token yalnızca yöneticinin tarayıcısında durur, GitHub dışında hiçbir yere
  gitmez ve depoya yazılan hiçbir dosyaya girmez.
- Bir yayın **tek commit**tir (poster + kaynak + künye), Git Data API ile:
  üç ayrı commit üç ayrı yayın ve künyenin henüz var olmayan dosyaları
  gösterdiği ara durumlar demek olurdu. Commit, yayını tetikler; eser
  yaklaşık bir dakika sonra herkeste görünür.
- Yayınlanmamış eserler o cihazın IndexedDB'sinde kalır ve kartta
  "yalnızca bu cihazda" etiketiyle görünür.
- Sunum listesi (hangi eserler slaytlara girecek) cihaza özeldir; kimse
  kimsenin seçimini değiştirmez ve seçim commit üretmez.

Depoyu kendi adınıza çatallarsanız (fork) elle ayar gerekmez: yayın akışı
`NEXT_PUBLIC_REPO` ve `NEXT_PUBLIC_REPO_BRANCH` değerlerini derlediği
depodan doldurur.

Not: kaldırılan bir eserin dosyaları HEAD'den silinir ama git geçmişinde
kalır; galeri büyüdükçe deponun boyutu da büyür.

## Piksel motoru

`lib/pixelate.ts`, sayının **tam** tutmasını iki adımda çözer:

1. **Yoğunluk.** Hücreler kare olduğu için ızgara tek bir sayıyla (`cols`)
   tanımlanır. İkili arama, konunun hedef sayıyı taşıyabildiği *en seyrek*
   ızgarayı bulur — en seyreği, çünkü hücreler sayının izin verdiği kadar
   büyük olmalı ki azalan nüfus dağılan bir görüntü gibi okunsun.
2. **Seçim.** Konunun değdiği tüm hücreler, kapsanma oranına göre sıralanır ve
   tam olarak hedef kadarı alınır. Böylece sayı tanım gereği tutar; elenenler
   siluetin en soluk kenar hücreleri olur.

İki adım da maske ve maskelenmiş renk kanalları üzerinde kurulan *summed-area
table*'lara dayanır; her dikdörtgen sorgusu O(1) olduğu için çözüm tam boy bir
fotoğrafta bile etkileşimli kalır.

Görsel bir kez analiz edilip birden çok sayıda çözülebilir (`prepareImage` +
`solveMosaic`); manifestodaki kaydırmalı dizi bunu kullanır — her durak, o
sayıda pikselle yapılmış gerçek bir çözümdür, soldurma ya da bulanıklaştırma
değil.

Şeffaf PNG'lerde siluet doğrudan alfa kanalından gelir. Düz fotoğraflarda arka
plan, kare kenarlarından örneklenen medyan renkle tahmin edilir; **arka plan
eşiği** kaydırıcısı bu toleransı yönetir. `Tam kare` modunda siluet aranmaz,
sayı satır × sütun olarak karşılanır.

## Yayınlama (GitHub Pages)

Uygulamanın sunucu tarafı yok — pikselleştirme, saklama ve dışa aktarma
tamamen tarayıcıda çalışır — bu yüzden statik site olarak dışa aktarılır
(`output: "export"`) ve GitHub Pages gerçek bir sunucu gibi iş görür.

Tek seferlik ayar: depoda **Settings → Pages → Build and deployment →
Source: GitHub Actions**'ı seçin. Sonrasında `main` (ya da bu geliştirme
dalına) her push, `.github/workflows/deploy.yml` üzerinden siteyi yayınlar.
Adres `https://<kullanıcı>.github.io/<depo>/` olur.

Proje sayfaları `/<depo>` alt yolunda yayınlandığı için build,
`NEXT_PUBLIC_BASE_PATH` değişkeninden bu ön eki alır; workflow bunu depo
adından otomatik doldurur. Değişken boşken (yerel geliştirme, Vercel,
Netlify) site kök dizinden servis edilir ve hiçbir şey değişmez.

Yerelde aynı çıktıyı denemek için:

```bash
NEXT_PUBLIC_BASE_PATH=/extinction npm run build   # out/ klasörünü üretir
npx serve out                                     # ya da herhangi bir statik sunucu
```

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # statik dışa aktarım -> out/
```

Statik dışa aktarımda `next start` kullanılmaz; `out/` klasörünü herhangi bir
statik sunucuyla servis edin.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn dizin düzeni (`components/ui`, `lib/utils`) · lucide-react · framer-motion.

`node scripts/generate-samples.mjs`, galeri boşken koridorda dönen örnek
posterleri yeniden üretir.
