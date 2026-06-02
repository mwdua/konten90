import React, { useRef, useState, useEffect } from 'react';
import { PosterData } from '../types';
import { formatIndonesianDate } from '../utils';
import { SocialIcon } from './SocialIcons';
import { ZoomIn, ZoomOut, Move, RotateCcw } from 'lucide-react';

interface PreviewCanvasProps {
  data: PosterData;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onChange?: (newData: Partial<PosterData>) => void;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({ data, canvasRef, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3); // Default initial scale
  const [isDraggingBg, setIsDraggingBg] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const bgStartOffset = useRef({ x: 0, y: 0 });

  // Handle Drag Start
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!data.bgImage) return;

    // Only allow left click
    if ('button' in e && e.button !== 0) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDraggingBg(true);
    dragStartPos.current = { x: clientX, y: clientY };
    bgStartOffset.current = { x: data.bgOffsetX || 0, y: data.bgOffsetY || 0 };
  };

  // Handle Drag Moving
  const handleDragMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingBg || !data.bgImage || !onChange) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = (clientX - dragStartPos.current.x) / scale;
    const dy = (clientY - dragStartPos.current.y) / scale;

    onChange({
      bgOffsetX: Math.round(bgStartOffset.current.x + dx),
      bgOffsetY: Math.round(bgStartOffset.current.y + dy)
    });
  };

  // Handle Drag Ending
  const handleDragEnd = () => {
    setIsDraggingBg(false);
  };

  // Get Design dimensions based on Aspect Ratio
  const getDesignHeight = () => {
    switch (data.aspectRatio) {
      case '1:1':
        return 1080;
      case '4:5':
        return 1350;
      case '16:9':
        return 608;
      case '9:16':
      default:
        return 1920;
    }
  };
  const designHeight = getDesignHeight();

  // Dynamic design variables based on Aspect Ratio
  const getDynamicStyles = () => {
    switch (data.aspectRatio) {
      case '1:1':
        return {
          judulSize: 'text-[72px]',
          subJudulSize: '36px',
          quoteSize: 'text-[18px]',
          tanggalSize: 'text-[15px]',
          bottomOffset: '160px',
          subJudulMargin: 'mb-2.5',
          judulMargin: 'mb-4.5',
          tanggalMargin: 'mb-4.5'
        };
      case '4:5':
        return {
          judulSize: 'text-[80px]',
          subJudulSize: '40px',
          quoteSize: 'text-[20px]',
          tanggalSize: 'text-[16px]',
          bottomOffset: '170px',
          subJudulMargin: 'mb-3',
          judulMargin: 'mb-5',
          tanggalMargin: 'mb-5'
        };
      case '16:9':
        return {
          judulSize: 'text-[54px]',
          subJudulSize: '24px',
          quoteSize: 'text-[15px]',
          tanggalSize: 'text-[13px]',
          bottomOffset: '130px',
          subJudulMargin: 'mb-1.5',
          judulMargin: 'mb-2.5',
          tanggalMargin: 'mb-2.5'
        };
      case '9:16':
      default:
        return {
          judulSize: 'text-[88px]',
          subJudulSize: '44px',
          quoteSize: 'text-[22px]',
          tanggalSize: 'text-[18px]',
          bottomOffset: '180px',
          subJudulMargin: 'mb-3',
          judulMargin: 'mb-6',
          tanggalMargin: 'mb-6'
        };
    }
  };
  const dynamicStyles = getDynamicStyles();

  // Dynamically scale the canvas to fit its container container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const containerWidth = container.clientWidth;
      // Calculate scale relative to design width (1080px)
      const calculatedScale = containerWidth / 1080;
      setScale(calculatedScale);
    };

    // Initialize
    handleResize();

    // ResizeObserver
    const observer = new ResizeObserver(() => {
      handleResize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [data.aspectRatio]);

  // Format the date to show in the badge
  const formattedDateString = formatIndonesianDate(data.tanggal);

  // Apply positions
  const getAlignmentClass = () => {
    switch (data.posisiTeks) {
      case 'tengah':
        return 'text-center items-center';
      case 'kanan':
        return 'text-right items-end';
      case 'kiri':
      default:
        return 'text-left items-start';
    }
  };

  // Get Font Family Class for the Main Title
  const getTitleFontFamily = () => {
    switch (data.fontJudul) {
      case 'Poppins':
        return 'font-heading font-black';
      case 'Montserrat':
        return 'font-montserrat font-extrabold';
      case 'Oswald':
        return 'font-oswald font-black';
      case 'Impact':
      default:
        return 'font-impact'; // fallback setup
    }
  };

  // Preset default elegant logos so elements look fully formatted even if empty
  const defaultInstansiLogo = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDYiIGZpbGw9IiMwRjlENTgiIHN0cm9rZT0iI0Q0QUYzNyIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHBhdGggZD0iTTUwIDIwIEw3NSA0MiBMNjUgNzUgTDM1IDc1IEwyNSA0MiBaIiBmaWxsPSJ3aGl0ZSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjEwIiBmaWxsPSIjRDRBRjM3Ii8+PC9zdmc+";

  const defaultKananLogo = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iODAiIHJ4PSIxNSIgZmlsbD0iIzE1NjVDMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMjIiIGZpbGw9IiNENEFGMzciLz48cGF0aCBkPSJNNDAgNTAgTDUwIDM1IEw2MCA1MCBMNTAgNjUgWiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=";

  const getLabelText = () => {
    switch (data.aspectRatio) {
      case '1:1':
        return 'Persegi 1:1 Feed Instagram (1080 x 1080 px)';
      case '4:5':
        return 'Potret 4:5 Feed Instagram (1080 x 1350 px)';
      case '16:9':
        return 'Lanskap 16:9 Slide / YouTube (1080 x 608 px)';
      case '9:16':
      default:
        return 'Cerita / Reels 9:16 Tiktok (1080 x 1920 px)';
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Label Indicator info */}
      <div className="mb-3 text-[11px] font-mono text-slate-500 text-center flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800/60 px-3.5 py-1.5 rounded-full border border-slate-200/40 dark:border-slate-700/30">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Rasio Desain: <strong className="text-slate-700 dark:text-slate-300">{getLabelText()}</strong></span>
      </div>

      {/* Outer wrapper that establishes the responsive width */}
      <div 
        ref={containerRef} 
        className="w-full relative bg-slate-100 rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 transition-all duration-300"
        style={{
          height: `${scale * designHeight}px`,
          aspectRatio: data.aspectRatio ? data.aspectRatio.replace(':', '/') : '9/16'
        }}
      >
        {/* The high-res virtual canvas of absolute size 1080 x designHeight */}
        <div
          id="posterCanvas"
          ref={canvasRef}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          className={`absolute top-0 left-0 w-[1080px] select-none bg-slate-950 overflow-hidden transition-all duration-75 ${
            data.bgImage ? 'cursor-grab active:cursor-grabbing hover:shadow-inner' : ''
          }`}
          style={{
            height: `${designHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* LAYER 1: Background Foto with custom zoom and offset */}
          {data.bgImage ? (
            <div
              id="bgImage"
              className="absolute inset-0 w-full h-full animate-fade-in pointer-events-none"
              style={{
                backgroundImage: `url(${data.bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `translate(${data.bgOffsetX || 0}px, ${data.bgOffsetY || 0}px) scale(${(data.bgZoom || 100) / 100})`,
                transformOrigin: 'center center',
                zIndex: 10
              }}
            />
          ) : (
            // Premium Dark Gradient Placeholder with clean legacy style definitions
            <div 
              className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8"
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #151515 100%)',
                zIndex: 10
              }}
            >
              <div 
                className="flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-12 max-w-lg text-center gap-4"
                style={{
                  borderColor: '#334155',
                  opacity: 0.4
                }}
              >
                <span className="text-8xl">🖼️</span>
                <span className="text-xl font-heading font-medium" style={{ color: '#ffffff' }}>Tap 🖼️ untuk upload foto</span>
                <span className="text-sm font-sans" style={{ color: '#94a3b8' }}>Dimensi background ideal 1080x1920 px untuk hasil optimal</span>
              </div>
            </div>
          )}

          {/* LAYER 2: Overlay Gelap */}
          <div
            id="overlay"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${data.overlayColor} 0%, ${data.overlayColor}8C 50%, rgba(0,0,0,0.1) 100%)`,
              opacity: data.overlayOpacity / 100,
              zIndex: 20
            }}
          />

          {/* LAYER 3: Header Bar */}
          <div
            id="headerBar"
            className="absolute top-0 left-0 w-full p-11 px-12 flex justify-between items-center pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 30
            }}
          >
            {/* Logo Kiri & Nama Instansi */}
            <div id="logoKiri" className="flex items-center gap-4 max-w-[65%]">
              <div
                className="w-16 h-16 rounded-full border-2 shadow-md shrink-0"
                style={{
                  backgroundImage: `url(${data.instansiLogo || defaultInstansiLogo})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderColor: '#D4AF37',
                  backgroundColor: '#1e293b'
                }}
              />
              <div className="flex flex-col text-left justify-center min-w-0">
                <div 
                  className="font-heading font-extrabold text-[15px] leading-normal uppercase tracking-wide truncate drop-shadow py-0.5"
                  style={{ color: '#F1C40F' }}
                >
                  {data.instansiNama1 || 'PEMERINTAH KABUPATEN'}
                </div>
                <div 
                  className="text-[14px] leading-normal font-medium truncate drop-shadow py-0.5"
                  style={{ color: '#F5E0A9' }}
                >
                  {data.instansiNama2 || 'DESA PONCOL'}
                </div>
              </div>
            </div>

            {/* Logo Kanan */}
            <div id="logoKanan" className="flex items-center gap-3">
              {data.logoKanan1 && (
                <img
                  src={data.logoKanan1}
                  alt="Logo Tambahan 1"
                  referrerPolicy="no-referrer"
                  className="h-14 object-contain drop-shadow"
                />
              )}
              {data.logoKanan2 && (
                <img
                  src={data.logoKanan2}
                  alt="Logo Tambahan 2"
                  referrerPolicy="no-referrer"
                  className="h-14 object-contain drop-shadow"
                />
              )}
              {!data.logoKanan1 && !data.logoKanan2 && (
                <img
                  src={defaultKananLogo}
                  alt="Default Logo"
                  className="h-12 object-contain drop-shadow"
                  style={{ opacity: 0.3 }}
                />
              )}
            </div>
          </div>

          {/* LAYER 4: Konten Utama / Tengah */}
          <div
            id="mainContent"
            className={`absolute left-0 w-full px-12 flex flex-col pointer-events-none text-shadow ${getAlignmentClass()}`}
            style={{
              bottom: dynamicStyles.bottomOffset,
              zIndex: 40
            }}
          >
            {/* Sub-judul */}
            {data.subJudul && (
              <span
                id="subJudul"
                className={`font-serif-italic italic leading-tight ${dynamicStyles.subJudulMargin} drop-shadow-md capitalize`}
                style={{
                  color: data.warnaSubJudul,
                  fontSize: dynamicStyles.subJudulSize
                }}
              >
                {data.subJudul}
              </span>
            )}

            {/* Judul Utama */}
            {data.judulUtama && (
              <h1
                id="judulUtama"
                className={`${getTitleFontFamily()} uppercase ${dynamicStyles.judulSize} leading-[1.0] tracking-tight font-black ${dynamicStyles.judulMargin} drop-shadow-lg text-wrap`}
                style={{
                  color: data.warnaJudul,
                }}
              >
                {data.judulUtama}
              </h1>
            )}

            {/* Badge Tanggal */}
            {data.tanggal && (
              <div
                id="badgeTanggal"
                className={`inline-flex items-center justify-center px-6 py-2 rounded-full font-heading font-bold ${dynamicStyles.tanggalSize} ${dynamicStyles.tanggalMargin} shadow-md pointer-events-none transition-transform duration-300`}
                style={{
                  backgroundColor: data.warnaBadgeTanggal,
                  color: '#000000',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)'
                }}
              >
                {formattedDateString}
              </div>
            )}

            {/* Quote / Kalimat Tema */}
            {data.quote && (
              <p
                id="quote"
                className={`italic font-medium ${dynamicStyles.quoteSize} leading-relaxed drop-shadow-md whitespace-pre-line`}
                style={{
                  color: 'rgba(241, 245, 249, 0.95)',
                  maxWidth: '850px'
                }}
              >
                "{data.quote}"
              </p>
            )}
          </div>

          {/* Decorative image sweetener (BBR Decor) in bottom-right corner when footer is hidden */}
          {!data.showFooter && (
            <div
              id="decorBBR"
              className="absolute right-12 flex items-center justify-center pointer-events-none"
              style={{
                bottom: '30px',
                zIndex: 45
              }}
            >
              <img
                src="https://res.cloudinary.com/maswardi/image/upload/v1780153540/BBR_ee3yvw.png"
                alt="BBR Decor"
                referrerPolicy="no-referrer"
                className="w-[120px] h-auto object-contain drop-shadow-md"
              />
            </div>
          )}

          {/* LAYER 5: Footer Banner */}
          {data.showFooter && (
            <div
              id="footerBanner"
              className="absolute bottom-0 left-0 w-full h-[120px] flex items-center justify-between px-12 pointer-events-none shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
              style={{
                background: `linear-gradient(90deg, ${data.footerColor1} 0%, ${data.footerColor2} 60%)`,
                borderTop: '4px solid rgba(0, 0, 0, 0.4)',
                zIndex: 50
              }}
            >
              {/* Kiri & Tengah: Ikon-Ikon Sosmed + Teks didekat Ikon */}
              <div className="flex items-center gap-5 pointer-events-auto">
                {/* Ikon-Ikon Sosmed (Perbesar 50%: dari w-10 h-10 ke w-[60px] h-[60px], icon size 20 ke 30) */}
                <div id="iconsSosmed" className="flex items-center gap-3.5">
                  {data.footerIcons.map((iconKey) => (
                    <div
                      key={iconKey}
                      className="w-[60px] h-[60px] rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-inner"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        border: '2px solid rgba(255, 255, 255, 0.25)'
                      }}
                    >
                      <SocialIcon name={iconKey} className="w-[30px] h-[30px]" style={{ color: '#ffffff' }} size={30} />
                    </div>
                  ))}
                </div>

                {/* Garis Pembatas Vertikal antara Ikon dan Teks */}
                {data.footerIcons.length > 0 && (
                  <div className="w-[3px] h-[55px] bg-white/20 rounded-full" />
                )}

                {/* Teks URL & Akun berada didekat Ikon Sosmed */}
                <div id="textSosmed" className="flex flex-col text-left justify-center pl-1">
                  <span 
                    className="font-heading font-extrabold text-[22px] hover:underline cursor-pointer animate-fade-in leading-tight"
                    style={{ color: '#ffffff' }}
                  >
                    {data.footerNamaAkun || '@pemdesponcol'}
                  </span>
                  <span 
                    className="font-mono text-[16px] tracking-wide mt-0.5"
                    style={{ color: 'rgba(255, 255, 255, 0.85)' }}
                  >
                    {data.footerUrl || 'pemdesponcol.go.id'}
                  </span>
                </div>
              </div>

              {/* Kanan: BBR Sweetener Logo - perfectly level/parallel with texts on the left */}
              <div className="flex items-center pointer-events-auto z-[51] mr-1">
                <img
                  src="https://res.cloudinary.com/maswardi/image/upload/v1780153540/BBR_ee3yvw.png"
                  alt="BBR Decor"
                  referrerPolicy="no-referrer"
                  className="w-[125px] h-auto object-contain drop-shadow-md"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Adjustment Toolbar right below the canvas */}
      {data.bgImage && (
        <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-sm animate-fade-in">
          <div className="flex items-center justify-between w-full bg-slate-100 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-md gap-3">
            {/* Reset Button */}
            <button
              onClick={() => onChange?.({ bgZoom: 100, bgOffsetX: 0, bgOffsetY: 0 })}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
              title="Reset Zoom & Posisi"
            >
              <RotateCcw className="w-4 h-4 text-emerald-500" />
            </button>

            {/* Splitter */}
            <div className="w-px h-5 bg-slate-300/60 dark:bg-slate-700" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const newZoom = Math.max(100, (data.bgZoom || 100) - 10);
                  onChange?.({ bgZoom: newZoom });
                }}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
                title="Zoom Out (-10%)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 min-w-[50px] text-center">
                {(data.bgZoom || 100)}%
              </span>

              <button
                onClick={() => {
                  const newZoom = Math.min(300, (data.bgZoom || 100) + 10);
                  onChange?.({ bgZoom: newZoom });
                }}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
                title="Zoom In (+10%)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Splitter */}
            <div className="w-px h-5 bg-slate-300/60 dark:bg-slate-700" />

            {/* Indicator of Pos */}
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold shrink-0">
              X:{data.bgOffsetX || 0}px Y:{data.bgOffsetY || 0}px
            </span>
          </div>

          <p className="text-[10px] text-slate-400 text-center flex items-center gap-1">
            <Move className="w-3 h-3 text-indigo-500 animate-pulse" />
            Geser (drag) foto secara langsung di atas untuk atur posisi lebih presisi!
          </p>
        </div>
      )}
    </div>
  );
};
