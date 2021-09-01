const stockCrawler = require('./crawlers/stock-crawler');
const financialCrawler = require('./crawlers/financial-crawler');
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
    var text = `u
    ¬
    -. Đơn vị tính: VND
    ¬ |aa r — | s | m|  sigpl - suấe
    i TÀI SẢN TM 31/12/2017 01/01/2017
    ~ A. TÀI SÀN NGÁN HẠN 100 304.907.897.804 | 303.343.080.673
    Ể-i I. Tiền và các khoản tương đương tiền 110 742.782.268 3.982.769.603 l
    È.. 1. Tiền T 3 742.782.268 3.982.769.603 |
    m II. Đầu tư tài chính ngắn hạn 120 206.400.000.000 | 197.100.000.000 |
    = 1. Đầu tư nắm giữ đền ngày đáo hạn 123 | 42 | 206.100.000.000 | 197.100.000.000 J
    .- III. Các khoản phải thu ngắn hạn 130 31.783.817.351| 39.974.833.589
    ~ 1. Phải thu ngắn hạn của khách hàng 131| 43 | 22.572.813.878| 32.893.933.052
    - 2. Trả trước cho người bán ngắn hạn 132 3.492.182.904 2.459.674.940
    ~ 3. Phải thu ngắn hạn khác 136 5.718.820.569 4.621.225.597
    — IV. Hàng tồn kho 140 59.323.287.887 | 55.676.938.766 |
    E 1, Hàng tồn kho 141 |.4.4 59.323287.887| 55.676.938.766
    — V. Tài sản ngắn hạn khác 150 6.958.010.298 6.608.538.715 ¡
    — 1. Chí phí trả trước ngắn hạn 151 457.076.184 785.253.351
    
    m 2. Thuế GTGT được khầu trừ 152 6.500.934.114 5.823.285.364 j
    _Ÿ _ .
    ¬- B. TÀI SÀN DÀI HẠN 200 45.622.375.971| 61.125.469.739 |
    — l. Các khoản phải thu dài hạn 210 259.671.405 386.746.496 t
    k 1. Phải thu dài hạn khác 216 259.671.405 386.746.496
    _Ä
    ~ II. Tài sản c định 220 42.422.309.564 | 46.087.500.558 1
    .- 1. Tài sản có định hữu hình 221 | 45 30.826.830.841| 34.209.142.305 3
    ~ Nguyên giá 222 83235.496.648| 86.810.456.109 3
    _ Giá trị hao mòn lũy kề 223 (52.408.665.807)| (52.601.313.804) :
    ~ 2. Tài sản cố định võ hình 227 | 46 11.595.478.723| 11.878.358.253 Ị(ỉ
    _ Nguyên giá 228 15.193.114.013| 15.193.114.013
    m Giá trị hao mòn lũy kế 229 (3.597635290)) (3.314.755.760) 3
    = III. Tài sản dở dang dài hạn 240 s 105.673.029 ]
    _ 1. Chi phí xây dựng cơ bản dở dang 242 - 105.673.029
    ~ IV. Tài sản dài hạn khác 260 2.940.395.002| 14.545.549.656
    ầ 1. Chi phí trả trước dài hạn 261 2293.049.687| 13.892.227.954
    L 2. Tài sản thuế thu nhập hoãn lại 262 | 4.11 647.345.315 653.321.702
    4 |
    E. TÓNG CỘNG TÀI SÀN (270 = 100 + 200 - 350.530.273.775 | 364.468.550.412
    :
    v
    =-
    -
    a
    hị —TmnmnmhÐtmtƒ/ƒÐ1ÐtÐtÐht t CT 7 77277227 n ấ a êê d n n ưỒẮắẮẠÁÃôẮỄẪỰỄầẹọƑẬẬẠạẠọọẠạụẠọạIUIoạọIđ
    L Các thuyết minh đính kèm là một bộ phận không tách rời của báo cáo tài chính g
    ể-=::———-—-_…-… NH .
    `;
    const result = financialCrawler.findInText(text, financialCrawler.FIELDS);

    response.json(result);
});

app.listen(port, () => { console.log('Server started at port 2400') });