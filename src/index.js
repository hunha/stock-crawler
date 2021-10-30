const stockCrawler = require('./crawlers/stock-crawler');
const financialCrawler = require('./crawlers/financial-crawler');
const exportService = require('./services/export-service');
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (request, response) => {
    response.json({ info: 'Node.js, Express, and Postgres API' })
});

app.get('/crawl-stocks', (request, response) => {
    stockCrawler.crawStock();
    response.json({ info: 'crawling' })
});

app.get('/crawl-financial', (request, response) => {
    financialCrawler.crawlFromImages('C:/workspaces/Test');

    response.json({ info: 'crawling' })
});

app.get('/test-tesseract', (request, response) => {
    const source = request.query.path;
    const ocrUtils = require('./common/ocr-utils');

    ocrUtils.recognize(source, 'vie').then((text) => {
        console.log(text);
        response.send(text);
    });
});

app.get('/test-crawl-text', (request, response) => {
    var text = `Công ty Cổ phần Thế Giới Số B03-DN/HN
    BÁO CÁO LƯU CHUYỀỄN TIỀN TẾ HỢP NHÁT
    cho năm tài chính kết thúc ngày 31 tháng 12 năm 2020
    VND
    Mã - Thuyết À
    số | CHỈ TIÊU minh Năm nay Năm trước :
    ẹ
    I. LƯU CHUYÊN TIỀN TỪ 7
    HOẠT ĐỘNG KINHDOANH F
    01 | Tổng lợi nhuận kế toán trước thuế 333.757.885.756 |  210.353.564.831 :
    Điều chỉnh cho các khoản: :
    02 Kháu hao và hao mòn tài sản È
    cố định (bao gồm phân bổ lợi thế  |10, 11,
    thương mại) 13 6.286.898.083 6.218.032.465
    03 Dự phòng 1.766.291.644 25.057.422.411
    04 Lãi chênh lệch tỷ giá hối đoái do |
    đánh giá lại các khoản mục tiên tệ Ệ
    l có gốc ngoại tệ (796.133.544) (731.562.266) ị
    05 Lãi từ hoạt động đầu tư (11.270.780.925) (689.751.425) k
    06 Chỉ phí lãi vay 23 27.018.043.416 47.582.349.664
    08 | Lợi nhuận từ hoạt động kinh doanh
    trước thay đổi vỗn lưu động 356.762.204.430 |  287.790.055.680
    09 Tăng các khoản phải thu (452.454.756.014) | (14.476.535.707)
    10 Giảm (tăng) hàng tồn kho 625.470.869.632 | (145.691.252.117)
    11 'Tăng các khoản phải trả 420.722.950.826 247.530.440.826
    12 (Tăng) giảm chỉ phí trả trước (9.318.011.941) 247.858.995
    14 Lãi vay đã trả (27.018.043.416) | (44.927.188.990)
    15 Thuế thu nhập doanh nghiệp đã nộp|_ 15 (87.779.021.182) | (43.781.076.400)
    20 | Lưu chuyển tiền thuần từ
    hoạt động kinh doanh 826.386.192.335 286.692.302.287
    II. LƯU CHUYỄN TIỀN TỪ
    HOẠT ĐỘNG ĐÀU TƯ
    21 Tiền chi để mua sắm tài sản cố định (12.606.476.296) (1.700.190.178) :
    22 Tiền thu do thanh lý tài sản cố định 2.271.060.607 - .
    23 Tiền chỉ cho vay - (350.000.000)
    24 Tiền thu hồi cho vay 634.750.000 Ẹ |
    25 Tiền chi đầu tư góp vốn vào
    đơn vị khác (53.314.598.727) -
    Tiền thuần đã thu về từ nghiệp vụ
    mua công ty con - 211.537.687
    27 Thu lãi tiền gửi 4.595.930.719 82.251.425 :
    30 | Lưu chuyển tiền thuần sử dụng vào
    hoạt động đầu tư (58.419.333.697) (1.756.401.066)
    II. LƯU CHUYỄN TIỀN TỪ
    HOẠT ĐỘNG TÀI CHÍNH
    31 Tiền thu từ phát hành cổ phiếu 19.1 12.000.000.000 12.000.000.000
    33 Tiền thu từ đi vay 18 3.834.070.229.646 | 3.891.177.798.097
    34 Tiền trả nợ gốc vay 48 |(3.824.720.880.444) | (4.107.810.207.861)
    36 Cổ tức đã trả 19.2 | (43.000.278.000) | (20.900.139.000)
    40 | Lưu chuyển tiền thuần sử dụng vào
    hoạt động tài chính (21.650.928.798) |  (225.632.548.764)
    8
    `;
    const result = financialCrawler.findInText(text, financialCrawler.FIELDS);

    response.json(result);
});

app.get('/export/financial-statement', (request, response) => {
    const stockCode = request.query.stock.toUpperCase();
    const fileName = `${stockCode}_statement.csv`;

    exportService.exportFinancialStatement(stockCode).then((csv) => {
        response.set({'Content-Disposition':'attachment; filename="' + fileName + '"'});
        response.send(csv);
    });
});

app.listen(port, () => { console.log('Server started at port 2400') });