// Test markdown table preservation with SHORT question
import { prepareQuestionForAnkiAsync } from './src/modules/anki/ankiConnect.js';

const shortQuestionWithTable = {
  id: 'test_short_table',
  type: 'SHORT',
  rawText: `Q: What are the values in this table?

| Column A | Column B |
| --- | --- |
| Value 1 | Value 2 |
| Value 3 | Value 4 |`,
  answer: 'Various values as shown in the table'
};

async function testShortWithTable() {
  console.log('📊 Testing SHORT Question with Markdown Table');
  console.log('============================================');
  
  try {
    const result = await prepareQuestionForAnkiAsync(shortQuestionWithTable, 'Short');
    console.log('\nSHORT question Anki note fields:');
    Object.entries(result.fields).forEach(([field, content]) => {
      console.log(`${field}:`);
      console.log(content);
      console.log('---');
      
      if (content.includes('<table>')) {
        console.log(`❌ ERROR: ${field} field contains HTML table!`);
      } else if (content.includes('| Column A |')) {
        console.log(`✅ SUCCESS: ${field} field preserves markdown table!`);
      }
    });
  } catch (error) {
    console.log('Expected error:', error.message);
  }
}

testShortWithTable();
