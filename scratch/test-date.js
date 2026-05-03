const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const testText = "วันที่ทำรายการ 02 พ.ค. 2569 - 13:32";
const normalizedText = testText.replace(/\s+/g, ' ');

console.log("Input Text:", normalizedText);

const thaiDateRegex = new RegExp(`(\\d{1,2})\\s*(${thaiMonths.join("|").replace(/\./g, "\\.")})\\s*(\\d{2,4})`, "i");
const match = normalizedText.match(thaiDateRegex);

if (match) {
    console.log("Match Found:", match);
    let [_, d, m, y] = match;
    
    const foundIdx = thaiMonths.findIndex(tm => tm.toLowerCase() === m.toLowerCase());
    const monthIdx = (foundIdx % 12) + 1;
    
    let yearNum = parseInt(y);
    if (yearNum < 100) yearNum += 2000; 
    if (yearNum > 2400) yearNum -= 543;
    
    const date = `${yearNum}-${monthIdx.toString().padStart(2, "0")}-${d.padStart(2, "0")}`;
    console.log("Extracted Date:", date);
} else {
    console.log("No Match Found");
}
