// Test markdown table preservation in Anki export
import { prepareQuestionForAnkiAsync, processContentForAnki } from './src/modules/anki/ankiConnect.js';

// Test question with markdown table and cloze deletions
const testQuestionWithTable = {
  id: 'test_table_cloze',
  type: 'CLOZE',
  rawText: `Q: Complete the table:

| {{c1::Name}} | {{c2::Age}} |
| --- | --- |
| John | {{c3::25}} |
| Mary | {{c4::30}} |`,
  orderedElements: []
};

async function testTablePreservation() {
  console.log('📊 Testing Markdown Table Preservation in Anki Export');
  console.log('===================================================');
  
  console.log('\nOriginal content:');
  console.log(testQuestionWithTable.rawText);
  
  console.log('\n🔍 Step 1: Testing processContentForAnki (should preserve markdown)');
  try {
    const processedContent = await processContentForAnki(testQuestionWithTable.rawText);
    console.log('Processed content:');
    console.log(processedContent);
    
    if (processedContent.includes('<table>')) {
      console.log('❌ ERROR: Table was converted to HTML!');
    } else if (processedContent.includes('| {{c1::Name}} |')) {
      console.log('✅ SUCCESS: Table preserved as markdown with cloze deletions intact!');
    } else {
      console.log('⚠️  WARNING: Unexpected format');
    }
  } catch (error) {
    console.log('Expected error (browser environment needed):', error.message);
  }
  
  console.log('\n🔍 Step 2: Testing full Anki preparation');
  try {
    const result = await prepareQuestionForAnkiAsync(testQuestionWithTable, 'Cloze');
    console.log('\nFinal Anki note fields:');
    Object.entries(result.fields).forEach(([field, content]) => {
      console.log(`${field}:`);
      console.log(content);
      console.log('---');
      
      if (content.includes('<table>')) {
        console.log(`❌ ERROR: ${field} field contains HTML table!`);
      } else if (content.includes('| {{c1::Name}} |')) {
        console.log(`✅ SUCCESS: ${field} field preserves markdown table with cloze deletions!`);
      }
    });
  } catch (error) {
    console.log('Expected error (browser environment needed):', error.message);
  }
  
  console.log('\n✅ Test completed!');
}

testTablePreservation();
