import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  title: string;
  filename?: string;
}

export async function exportReportToPDF(
  reportElement: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const { title, filename } = options;

  const loadingToast = document.createElement('div');
  loadingToast.className = 'fixed top-4 right-4 bg-rocket-600 text-white px-4 py-2 rounded-lg shadow-lg z-[9999] flex items-center gap-2';
  loadingToast.innerHTML = `
    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Generating PDF...</span>
  `;
  document.body.appendChild(loadingToast);

  try {
    await new Promise(resolve => setTimeout(resolve, 300));

    const clone = reportElement.cloneNode(true) as HTMLElement;
    clone.style.width = '1000px';
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.background = 'white';
    clone.style.padding = '24px';

    const dateFilters = clone.querySelector('[data-date-filters]');
    if (dateFilters) {
      (dateFilters as HTMLElement).style.display = 'none';
    }

    const truncatedLabels = clone.querySelectorAll('[data-stat-label], [data-category-label]');
    truncatedLabels.forEach(label => {
      const el = label as HTMLElement;
      el.style.whiteSpace = 'nowrap';
      el.style.overflow = 'visible';
      el.style.textOverflow = 'unset';
    });

    document.body.appendChild(clone);

    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      onclone: (clonedDoc) => {
        const svgs = clonedDoc.querySelectorAll('svg');
        svgs.forEach(svg => {
          const rect = svg.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            svg.setAttribute('width', rect.width.toString());
            svg.setAttribute('height', rect.height.toString());
          }
        });

        const container = clonedDoc.body.querySelector('[style*="left: -9999px"]');
        if (container) {
          (container as HTMLElement).style.overflow = 'visible';
        }
      }
    });

    document.body.removeChild(clone);

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 14, 15);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 22);

    pdf.setTextColor(0, 0, 0);

    const imgData = canvas.toDataURL('image/png');
    const startY = 28;

    let heightLeft = imgHeight;
    let position = startY;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - position);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeFilename = (filename || title)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();

    pdf.save(`${safeFilename}_${new Date().toISOString().split('T')[0]}.pdf`);

    loadingToast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-[9999] flex items-center gap-2';
    loadingToast.innerHTML = `
      <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <span>PDF downloaded!</span>
    `;
  } catch (error) {
    console.error('PDF export failed:', error);
    loadingToast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-[9999] flex items-center gap-2';
    loadingToast.innerHTML = `
      <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span>Export failed. Please try again.</span>
    `;
  } finally {
    setTimeout(() => {
      loadingToast.remove();
    }, 2000);
  }
}
