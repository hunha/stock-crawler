
/**
 * 
 * @param {string} dateString date string in format 'DD/mm/yyyy'
 */
const parseVNDate = (dateString) => {
    var dateParts = dateString.split('/');
    return new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
}

module.exports = {
    parseVNDate
}