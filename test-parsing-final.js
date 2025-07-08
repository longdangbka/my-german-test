const { parseClozeMarkers } = require('./src/shared/constants/index.js');

console.log('Testing cloze parsing:');
console.log('1. Legacy syntax:', parseClozeMarkers('Test {{legacy}} parsing'));
console.log('2. New syntax:', parseClozeMarkers('Test {{c::new}} parsing'));  
console.log('3. Mixed syntax:', parseClozeMarkers('Test {{legacy}} and {{c::new}} together'));
console.log('4. Table test:', parseClozeMarkers('| {{Berlin}} | {{c::Paris}} |'));
console.log('5. Multiple blanks:', parseClozeMarkers('{{A}} {{B}} {{c::C}} {{c::D}}'));
