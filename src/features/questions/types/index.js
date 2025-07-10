import * as TrueFalse from './TrueFalse';
import * as Cloze from './Cloze';
import * as ShortAnswer from './ShortAnswer';
import '../../../assets/styles/question-block.css';

export const questionTypes = {
  'T-F': TrueFalse,
  'CLOZE': Cloze,
  'SHORT': ShortAnswer,
};

export { TrueFalse, Cloze, ShortAnswer };
