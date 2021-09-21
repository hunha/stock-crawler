const tesseract = require("node-tesseract-ocr")

const recognize = async (path, language) => {
    try {
        const result = await tesseract.recognize(
            path,
            {
                lang: language,
                oem: 1,
                psm: 6,
            }
        );

        return result;
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    recognize
}