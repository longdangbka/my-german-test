import * as TrueFalse from './TrueFalse';
import * as Cloze from './Cloze';
import * as ShortAnswer from './ShortAnswer';
import './question-block.css';

export const questionTypes = {
  'T-F': TrueFalse,
  'CLOZE': Cloze,
  'SHORT': ShortAnswer,
};
