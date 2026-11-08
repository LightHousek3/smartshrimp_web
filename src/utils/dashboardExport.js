import ExcelJS from 'exceljs';
import dayjs from 'dayjs';

/**
 * Brand color palette (ARGB format for ExcelJS)
 */
const COLORS = {
    NAVY_DARK: 'FF0F1C2E',     // #0F1C2E - Primary Dark / Header
    NAVY_SUBTLE: 'FF1E293B',   // #1E293B - Secondary Navy
    SLATE_HEADER: 'FF334155',  // #334155 - Table Header Dark
    TEAL_PRIMARY: 'FF0F9B8E',  // #0F9B8E - Brand Teal
    TEAL_DARK: 'FF0F766E',     // #0F766E - RAG Section Header
    TEAL_HEADER: 'FF115E59',   // #115E59 - RAG Table Header
    TEAL_LIGHT: 'FFE2F6F3',    // #E2F6F3 - Active / Highlight Bg
    CARD_HEADER: 'FFF1F5F9',   // #F1F5F9 - Scorecard Title Bg
    CARD_BG: 'FFF8FAFC',       // #F8FAFC - Scorecard Body Bg
    ROW_ALT: 'FFF8FAFC',       // #F8FAFC - Alternating Table Row
    BORDER: 'FFCBD5E1',        // #CBD5E1 - Border Gray
    BORDER_LIGHT: 'FFE2E8F0',  // #E2E8F0 - Soft Border
    TEXT_MAIN: 'FF0F1C2E',     // Main text
    TEXT_MUTED: 'FF64748B',    // Muted text
    WHITE: 'FFFFFFFF',
    AMBER_TEXT: 'FFD98314',    // Pending text
    AMBER_BG: 'FFFBF0DC',      // Pending bg
    RED_TEXT: 'FFD43B57',        // Blocked text
    RED_BG: 'FFFBE6EA',        // Blocked bg
    GRAY_TEXT: 'FF64748B',     // Inactive text
    GRAY_BG: 'FFEEF1F6',       // Inactive bg
};

/**
 * Standard thin border helper
 */
const thinBorder = {
    top: { style: 'thin', color: { argb: COLORS.BORDER } },
    bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
    left: { style: 'thin', color: { argb: COLORS.BORDER } },
    right: { style: 'thin', color: { argb: COLORS.BORDER } },
};

/**
 * Apply borders to a merged cell block
 */
const borderBox = (ws, startCol, startRow, endCol, endRow, border = thinBorder) => {
    for (let r = startRow; r <= endRow; r += 1) {
        for (let c = startCol; c <= endCol; c += 1) {
            ws.getCell(r, c).border = border;
        }
    }
};

/**
 * Export 1-Page Executive Dashboard to Excel (.xlsx)
 *
 * @param {Object} params
 * @param {Object} params.overview System overview numbers
 * @param {Array} params.kpis KPI card data
 * @param {Array} params.accountBreakdown Account status counts
 * @param {Array} params.aiDaily 7-day AI metrics
 * @param {Array} params.ragDaily 7-day RAG metrics
 * @param {Object} params.filters Date range & report title
 */
export async function exportDashboardToExcel({
    overview = {},
    accountBreakdown = [],
    aiDaily = [],
    ragDaily = [],
    filters = {},
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartShrimp System';
    workbook.lastModifiedBy = 'Admin';
    workbook.created = new Date();
    workbook.modified = new Date();

    const ws = workbook.addWorksheet('TongQuanDieuHanh', {
        pageSetup: {
            orientation: 'landscape',
            paperSize: 9, // A4
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            margins: {
                left: 0.35,
                right: 0.35,
                top: 0.35,
                bottom: 0.35,
                header: 0.2,
                footer: 0.2,
            },
        },
        views: [{ showGridLines: true }],
    });

    // ── Column Widths (A to O) ────────────────────────────────────────────────
    ws.columns = [
        { key: 'colA', width: 2.5 },  // Left margin
        // AI Table & Left KPIs (B..G)
        { key: 'colB', width: 11.5 }, // Ngày
        { key: 'colC', width: 11.5 }, // Tổng
        { key: 'colD', width: 12.0 }, // Thành công
        { key: 'colE', width: 11.5 }, // Failed predictions
        { key: 'colF', width: 12.0 }, // Tỉ lệ
        { key: 'colG', width: 13.0 }, // Đ.Cậy TB
        // Spacer (H)
        { key: 'colH', width: 3.5 },  // Center divider
        // RAG Table & Right KPIs (I..N)
        { key: 'colI', width: 11.5 }, // Ngày
        { key: 'colJ', width: 12.0 }, // Tổng
        { key: 'colK', width: 12.0 }, // Đã trả lời
        { key: 'colL', width: 12.0 }, // Missing sources
        { key: 'colM', width: 13.0 }, // Khớp thấp
        { key: 'colN', width: 12.0 }, // Đánh giá
        { key: 'colO', width: 2.5 },  // Right margin
    ];

    // ── 1. HEADER BANNER (Row 2 & 3) ──────────────────────────────────────────
    ws.getRow(1).height = 10;

    ws.mergeCells('B2:N2');
    const headerTitle = ws.getCell('B2');
    headerTitle.value = 'HỆ THỐNG QUẢN LÝ VÀ TƯ VẤN VẬN HÀNH NUÔI TÔM SMARTSHRIMP';
    headerTitle.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: COLORS.WHITE } };
    headerTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    headerTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_DARK } };
    ws.getRow(2).height = 28;

    ws.mergeCells('B3:N3');
    const fromStr = filters.from ? dayjs(filters.from).format('DD/MM/YYYY') : dayjs().subtract(6, 'day').format('DD/MM/YYYY');
    const toStr = filters.to ? dayjs(filters.to).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');
    const headerMeta = ws.getCell('B3');
    headerMeta.value = `BÁO CÁO TỔNG QUAN HỆ THỐNG   |   Kỳ dữ liệu: ${fromStr} - ${toStr}   |   Xuất lúc: ${dayjs().format('DD/MM/YYYY HH:mm')}   |   Người xuất: Quản trị viên (Admin)`;
    headerMeta.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FFE2E8F0' } };
    headerMeta.alignment = { horizontal: 'center', vertical: 'middle' };
    headerMeta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_SUBTLE } };
    ws.getRow(3).height = 20;

    borderBox(ws, 2, 2, 14, 3, {
        top: { style: 'medium', color: { argb: COLORS.NAVY_DARK } },
        bottom: { style: 'medium', color: { argb: COLORS.NAVY_DARK } },
        left: { style: 'medium', color: { argb: COLORS.NAVY_DARK } },
        right: { style: 'medium', color: { argb: COLORS.NAVY_DARK } },
    });

    ws.getRow(4).height = 8;

    // ── 2. SECTION 1: 6 KPI SCORECARDS (Row 5 to 8) ───────────────────────────
    ws.mergeCells('B5:N5');
    const kpiTitle = ws.getCell('B5');
    kpiTitle.value = 'I. CHỈ SỐ HOẠT ĐỘNG TOÀN HỆ THỐNG (SYSTEM OVERVIEW KPIS)';
    kpiTitle.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLORS.NAVY_DARK } };
    kpiTitle.alignment = { vertical: 'middle' };
    ws.getRow(5).height = 20;

    const totalAcc = overview.totalAccounts ?? overview.managedAccounts ?? 0;
    const totalAiInPeriod = aiDaily.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const successAiInPeriod = aiDaily.reduce((s, d) => s + (Number(d.success) || 0), 0);
    const totalRagInPeriod = ragDaily.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const answeredRagInPeriod = ragDaily.reduce((s, d) => s + (Number(d.answered) || 0), 0);

    const kpiDefs = [
        {
            title: 'TỔNG TÀI KHOẢN',
            val: totalAcc,
            sub: `${overview.activeAccounts ?? 0} đang hoạt động`,
            startCol: 2, endCol: 3,
        },
        {
            title: 'CHỜ KÍCH HOẠT',
            val: overview.pendingActivation ?? 0,
            sub: `${overview.blockedAccounts ?? 0} đã bị chặn`,
            startCol: 4, endCol: 5,
        },
        {
            title: 'TRANG TRẠI HOẠT ĐỘNG',
            val: overview.activeFarms ?? 0,
            sub: 'Toàn hệ thống',
            startCol: 6, endCol: 7,
        },
        {
            title: 'VỤ NUÔI ĐANG CHẠY',
            val: overview.activeSeasons ?? 0,
            sub: 'Đang hoạt động',
            startCol: 9, endCol: 10,
        },
        {
            title: 'AI CHẨN ĐOÁN (TRONG KỲ)',
            val: totalAiInPeriod,
            sub: `${successAiInPeriod} ca đạt | Hôm nay: ${overview.aiRequestsToday ?? 0}`,
            startCol: 11, endCol: 12,
        },
        {
            title: 'CÂU HỎI RAG (TRONG KỲ)',
            val: totalRagInPeriod,
            sub: `${answeredRagInPeriod} đã trả lời | Hôm nay: ${overview.ragQuestionsToday ?? 0}`,
            startCol: 13, endCol: 14,
        },
    ];

    ws.getRow(6).height = 18;
    ws.getRow(7).height = 26;
    ws.getRow(8).height = 16;

    kpiDefs.forEach((card) => {
        // Row 6: Title
        ws.mergeCells(6, card.startCol, 6, card.endCol);
        const cellT = ws.getCell(6, card.startCol);
        cellT.value = card.title;
        cellT.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.TEXT_MUTED } };
        cellT.alignment = { horizontal: 'center', vertical: 'middle' };
        cellT.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.CARD_HEADER } };

        // Row 7: Big Value
        ws.mergeCells(7, card.startCol, 7, card.endCol);
        const cellV = ws.getCell(7, card.startCol);
        cellV.value = card.val;
        cellV.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: COLORS.NAVY_DARK } };
        cellV.alignment = { horizontal: 'center', vertical: 'middle' };
        cellV.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.CARD_BG } };

        // Row 8: Subtitle
        ws.mergeCells(8, card.startCol, 8, card.endCol);
        const cellS = ws.getCell(8, card.startCol);
        cellS.value = card.sub;
        cellS.font = { name: 'Segoe UI', size: 8, bold: false, color: { argb: COLORS.TEAL_PRIMARY } };
        cellS.alignment = { horizontal: 'center', vertical: 'middle' };
        cellS.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.CARD_BG } };

        borderBox(ws, card.startCol, 6, card.endCol, 8);
    });

    ws.getRow(9).height = 8;

    // ── 3. SECTION 2: ACCOUNT BREAKDOWN (Row 10 to 11) ────────────────────────
    ws.mergeCells('B10:N10');
    const accTitle = ws.getCell('B10');
    accTitle.value = 'II. PHÂN BỔ TRẠNG THÁI TÀI KHOẢN (ACCOUNT STATUS BREAKDOWN)';
    accTitle.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLORS.NAVY_DARK } };
    accTitle.alignment = { vertical: 'middle' };
    ws.getRow(10).height = 20;

    const totalAccCount = accountBreakdown.reduce((sum, item) => sum + (Number(item.count) || 0), 0) || totalAcc;
    const accRanges = [
        { startCol: 2, endCol: 4, fallbackLabel: 'Hoạt động', color: COLORS.TEAL_PRIMARY, bg: COLORS.TEAL_LIGHT },
        { startCol: 5, endCol: 7, fallbackLabel: 'Chờ kích hoạt', color: COLORS.AMBER_TEXT, bg: COLORS.AMBER_BG },
        { startCol: 9, endCol: 11, fallbackLabel: 'Không hoạt động', color: COLORS.GRAY_TEXT, bg: COLORS.GRAY_BG },
        { startCol: 12, endCol: 14, fallbackLabel: 'Đã khóa', color: COLORS.RED_TEXT, bg: COLORS.RED_BG },
    ];
    const accItems = accRanges.map((r, idx) => {
        const item = accountBreakdown[idx];
        return {
            label: item?.label || r.fallbackLabel,
            count: Number(item?.count) || 0,
            color: r.color,
            bg: r.bg,
            startCol: r.startCol,
            endCol: r.endCol,
        };
    });

    ws.getRow(11).height = 22;
    accItems.forEach((item) => {
        ws.mergeCells(11, item.startCol, 11, item.endCol);
        const cell = ws.getCell(11, item.startCol);
        const pct = totalAccCount > 0 ? ((item.count / totalAcc) * 100).toFixed(1) : '0.0';
        cell.value = `● ${item.label}: ${item.count} (${pct}%)`;
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: item.color } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.bg } };
        borderBox(ws, item.startCol, 11, item.endCol, 11);
    });

    ws.getRow(12).height = 10;

    // ── 4. SECTION 3: TWO-COLUMN DATA GRIDS (AI & RAG) ────────────────────────
    // Header Bars (Row 13)
    ws.mergeCells('B13:G13');
    const aiSecTitle = ws.getCell('B13');
    aiSecTitle.value = 'III. HIỆU SUẤT AI CHẨN ĐOÁN (AI ANALYTICS)';
    aiSecTitle.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.WHITE } };
    aiSecTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    aiSecTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_SUBTLE } };

    ws.mergeCells('I13:N13');
    const ragSecTitle = ws.getCell('I13');
    ragSecTitle.value = 'IV. TƯƠNG TÁC HỎI ĐÁP RAG (RAG KNOWLEDGE)';
    ragSecTitle.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.WHITE } };
    ragSecTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    ragSecTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TEAL_DARK } };
    ws.getRow(13).height = 22;

    // Table Column Headers (Row 14)
    ws.getRow(14).height = 20;
    const aiHeaders = ['Ngày', 'Tổng', 'T.Công', 'Lỗi KT', 'Tỉ lệ đạt', 'Đ.Cậy TB'];
    aiHeaders.forEach((h, idx) => {
        const col = 2 + idx;
        const cell = ws.getCell(14, col);
        cell.value = h;
        cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.WHITE } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SLATE_HEADER } };
        cell.border = thinBorder;
    });

    const ragHeaders = ['Ngày', 'Tổng', 'Đã trả lời', 'Ko nguồn', 'Khớp thấp', 'Đánh giá'];
    ragHeaders.forEach((h, idx) => {
        const col = 9 + idx;
        const cell = ws.getCell(14, col);
        cell.value = h;
        cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.WHITE } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TEAL_HEADER } };
        cell.border = thinBorder;
    });

    // Data Rows (Row 15 to 21 - Max 7 days window)
    const rowCount = Math.max(aiDaily.length, ragDaily.length, 7);
    const startDataRow = 15;

    for (let i = 0; i < rowCount; i += 1) {
        const rNum = startDataRow + i;
        ws.getRow(rNum).height = 18;
        const isAlt = i % 2 === 1;
        const rowBg = isAlt ? COLORS.ROW_ALT : COLORS.WHITE;

        const ai = aiDaily[i] || { date: `N-${i + 1}`, total: 0, success: 0, errors: 0, avgConfidence: 0 };
        const rag = ragDaily[i] || { date: `N-${i + 1}`, total: 0, answered: 0, noSource: 0, lowMatch: 0, avgRating: 0 };

        // AI Data Cells (Col B..G)
        const cellB = ws.getCell(rNum, 2); // Ngày
        cellB.value = ai.date || '-';
        cellB.alignment = { horizontal: 'center', vertical: 'middle' };

        const cellC = ws.getCell(rNum, 3); // Tổng
        cellC.value = Number(ai.total) || 0;
        cellC.numFmt = '#,##0';
        cellC.alignment = { horizontal: 'right', vertical: 'middle' };

        const cellD = ws.getCell(rNum, 4); // Thành công
        cellD.value = Number(ai.success) || 0;
        cellD.numFmt = '#,##0';
        cellD.alignment = { horizontal: 'right', vertical: 'middle' };

        const cellE = ws.getCell(rNum, 5); // Technical errors
        cellE.value = Number(ai.errors) || 0;
        cellE.numFmt = '#,##0';
        cellE.alignment = { horizontal: 'right', vertical: 'middle' };

        const cellF = ws.getCell(rNum, 6); // Tỉ lệ
        cellF.value = { formula: `IF(C${rNum}>0, D${rNum}/C${rNum}, 0)` };
        cellF.numFmt = '0.0%';
        cellF.alignment = { horizontal: 'right', vertical: 'middle' };

        const cellG = ws.getCell(rNum, 7); // Độ tin cậy
        // If confidence is already 0-100, divide by 100 for percentage format
        const confVal = Number(ai.avgConfidence) || 0;
        cellG.value = confVal > 1 ? confVal / 100 : confVal;
        cellG.numFmt = '0.0%';
        cellG.alignment = { horizontal: 'right', vertical: 'middle' };

        // Style AI cells
        [cellB, cellC, cellD, cellE, cellF, cellG].forEach((c) => {
            c.font = { name: 'Segoe UI', size: 9 };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            c.border = thinBorder;
        });

        // RAG Data Cells (Col I..N)
        const cellI = ws.getCell(rNum, 9); // Ngày
        cellI.value = rag.date || '-';
        cellI.alignment = { horizontal: 'center', vertical: 'middle' };

        const cellJ = ws.getCell(rNum, 10); // Tổng
        cellJ.value = Number(rag.total) || 0;
        cellJ.numFmt = '#,##0';
        cellJ.alignment = { horizontal: 'right', vertical: 'middle' };

        const cellK = ws.getCell(rNum, 11); // Đã trả lời
        cellK.value = Number(rag.answered) || 0;
        cellK.numFmt = '#,##0';
        cellK.alignment = { horizontal: 'right', vertical: 'middle' };

        const cellL = ws.getCell(rNum, 12); // Không nguồn
        cellL.value = Number(rag.noSource) || 0;
        cellL.numFmt = '#,##0';
        cellL.alignment = { horizontal: 'right', vertical: 'middle' };

        const cellM = ws.getCell(rNum, 13); // Khớp thấp
        cellM.value = Number(rag.lowMatch) || 0;
        cellM.numFmt = '#,##0';
        cellM.alignment = { horizontal: 'right', vertical: 'middle' };

        const cellN = ws.getCell(rNum, 14); // Đánh giá
        cellN.value = Number(rag.avgRating) || 0;
        cellN.numFmt = '0.0 "★"';
        cellN.alignment = { horizontal: 'right', vertical: 'middle' };

        // Style RAG cells
        [cellI, cellJ, cellK, cellL, cellM, cellN].forEach((c) => {
            c.font = { name: 'Segoe UI', size: 9 };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            c.border = thinBorder;
        });
    }

    // ── Summary / Total Row (Row 22) ──────────────────────────────────────────
    const lastDataRow = startDataRow + rowCount - 1;
    const summaryRow = lastDataRow + 1;
    ws.getRow(summaryRow).height = 22;

    const doubleBottomBorder = {
        top: { style: 'thin', color: { argb: COLORS.BORDER } },
        bottom: { style: 'double', color: { argb: COLORS.NAVY_DARK } },
        left: { style: 'thin', color: { argb: COLORS.BORDER } },
        right: { style: 'thin', color: { argb: COLORS.BORDER } },
    };

    // AI Summary
    const sumB = ws.getCell(summaryRow, 2);
    sumB.value = 'TỔNG / TB';
    sumB.alignment = { horizontal: 'center', vertical: 'middle' };

    const sumC = ws.getCell(summaryRow, 3);
    sumC.value = { formula: `SUM(C${startDataRow}:C${lastDataRow})` };
    sumC.numFmt = '#,##0';
    sumC.alignment = { horizontal: 'right', vertical: 'middle' };

    const sumD = ws.getCell(summaryRow, 4);
    sumD.value = { formula: `SUM(D${startDataRow}:D${lastDataRow})` };
    sumD.numFmt = '#,##0';
    sumD.alignment = { horizontal: 'right', vertical: 'middle' };

    const sumE = ws.getCell(summaryRow, 5);
    sumE.value = { formula: `SUM(E${startDataRow}:E${lastDataRow})` };
    sumE.numFmt = '#,##0';
    sumE.alignment = { horizontal: 'right', vertical: 'middle' };

    const sumF = ws.getCell(summaryRow, 6);
    sumF.value = { formula: `IF(C${summaryRow}>0, D${summaryRow}/C${summaryRow}, 0)` };
    sumF.numFmt = '0.0%';
    sumF.alignment = { horizontal: 'right', vertical: 'middle' };

    const sumG = ws.getCell(summaryRow, 7);
    sumG.value = { formula: `AVERAGE(G${startDataRow}:G${lastDataRow})` };
    sumG.numFmt = '0.0%';
    sumG.alignment = { horizontal: 'right', vertical: 'middle' };

    [sumB, sumC, sumD, sumE, sumF, sumG].forEach((c) => {
        c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.NAVY_DARK } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BORDER_LIGHT } };
        c.border = doubleBottomBorder;
    });

    // RAG Summary
    const sumI = ws.getCell(summaryRow, 9);
    sumI.value = 'TỔNG / TB';
    sumI.alignment = { horizontal: 'center', vertical: 'middle' };

    const sumJ = ws.getCell(summaryRow, 10);
    sumJ.value = { formula: `SUM(J${startDataRow}:J${lastDataRow})` };
    sumJ.numFmt = '#,##0';
    sumJ.alignment = { horizontal: 'right', vertical: 'middle' };

    const sumK = ws.getCell(summaryRow, 11);
    sumK.value = { formula: `SUM(K${startDataRow}:K${lastDataRow})` };
    sumK.numFmt = '#,##0';
    sumK.alignment = { horizontal: 'right', vertical: 'middle' };

    const sumL = ws.getCell(summaryRow, 12);
    sumL.value = { formula: `SUM(L${startDataRow}:L${lastDataRow})` };
    sumL.numFmt = '#,##0';
    sumL.alignment = { horizontal: 'right', vertical: 'middle' };

    const sumM = ws.getCell(summaryRow, 13);
    sumM.value = { formula: `SUM(M${startDataRow}:M${lastDataRow})` };
    sumM.numFmt = '#,##0';
    sumM.alignment = { horizontal: 'right', vertical: 'middle' };

    const sumN = ws.getCell(summaryRow, 14);
    sumN.value = { formula: `AVERAGE(N${startDataRow}:N${lastDataRow})` };
    sumN.numFmt = '0.0 "★"';
    sumN.alignment = { horizontal: 'right', vertical: 'middle' };

    [sumI, sumJ, sumK, sumL, sumM, sumN].forEach((c) => {
        c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.NAVY_DARK } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BORDER_LIGHT } };
        c.border = doubleBottomBorder;
    });

    // ── 5. FOOTER (Row 23 & 24) ───────────────────────────────────────────────
    const footerRow = summaryRow + 2;
    ws.mergeCells(`B${footerRow}:N${footerRow}`);
    const footCell = ws.getCell(`B${footerRow}`);
    footCell.value = 'Hệ thống Quản lý và Tư vấn Vận hành SmartShrimp © 2026. Báo cáo được khởi tạo tự động phục vụ công tác điều hành & lưu trữ nội bộ.';
    footCell.font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
    footCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(footerRow).height = 18;

    // ── Generate and trigger browser download ─────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const fileName = `SmartShrimp_Executive_Dashboard_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);

    return fileName;
}
