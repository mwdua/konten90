export interface PosterData {
  instansiLogo: string | null;
  instansiNama1: string;
  instansiNama2: string;
  logoKanan1: string | null;
  logoKanan2: string | null;
  bgImage: string | null;
  bgZoom: number; // percentage, e.g. 100% to 300%
  bgOffsetX: number; // offset in px
  bgOffsetY: number; // offset in px
  overlayOpacity: number; // 0 - 100
  overlayColor: string;
  subJudul: string;
  judulUtama: string;
  tanggal: string; // YYYY-MM-DD
  quote: string;
  warnaJudul: string;
  warnaSubJudul: string;
  warnaBadgeTanggal: string;
  fontJudul: 'Impact' | 'Poppins' | 'Montserrat' | 'Oswald';
  posisiTeks: 'kiri' | 'tengah' | 'kanan';
  aspectRatio: '9:16' | '1:1' | '4:5' | '16:9';
  showFooter: boolean;
  footerIcons: string[]; // ['ig', 'yt', 'fb', 'web', 'tw', 'tt']
  footerNamaAkun: string;
  footerUrl: string;
  footerColor1: string;
  footerColor2: string;
}

export const DEFAULT_POSTER_DATA: PosterData = {
  instansiLogo: null,
  instansiNama1: "Pemerintah Desa Poncol",
  instansiNama2: "Kec. Poncol Kab. Magetan",
  logoKanan1: null,
  logoKanan2: null,
  bgImage: null,
  bgZoom: 100,
  bgOffsetX: 0,
  bgOffsetY: 0,
  overlayOpacity: 75,
  overlayColor: "#000000",
  subJudul: "Selamat Hari Pendidikan Nasional",
  judulUtama: "HARDIKNAS 2026",
  tanggal: "2026-05-02",
  quote: "Menguatkan Partisipasi Semesta\nMewujudkan Pendidikan Bermutu",
  warnaJudul: "#D4AF37",
  warnaSubJudul: "#D4AF37",
  warnaBadgeTanggal: "#D4AF37",
  fontJudul: "Oswald",
  posisiTeks: "tengah",
  aspectRatio: "9:16",
  showFooter: true,
  footerIcons: ["ig", "yt", "fb", "web"],
  footerNamaAkun: "@pemdesponcol",
  footerUrl: "pemdesponcol.go.id",
  footerColor1: "#D4AF37",
  footerColor2: "#1a1a1a"
};
