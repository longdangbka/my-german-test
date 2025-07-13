## Two Key Phases of Classification

### Questions

````ad-question
TYPE: Short
ID: qTwoKeyPhasesofClassi_1_short_0jdq7d

Q: What are the two main phases of classification and what happens in each?

A: Learning Phase (Induction) – trains a model using labeled data; Querying Phase (Deduction) – uses the trained model to predict labels for new data.

E: The Learning Phase builds a classifier from labeled data, while the Querying Phase applies this trained classifier to new, unlabeled instances.
````

````ad-question
TYPE: T-F
ID: qTwoKeyPhasesofClassi_2_t-f_doyoxn

Q: In the Learning Phase, a classifier predicts labels for new unlabeled data.

A: F

E: The Learning Phase involves training the classifier; prediction occurs in the Querying Phase.
````

````ad-question
TYPE: Cloze
ID: qTwoKeyPhasesofClassi_3_cloze_pfxc5h

Q: The formula for the Gini Index is {{c1::$\text{Gini}(D) = 1 - \sum_{i=1}^k p_i^2$}}.

E: The Gini Index quantifies impurity by summing the squares of class probabilities and subtracting from 1.
````

````ad-question
TYPE: Short
ID: qTwoKeyPhasesofClassi_4_short_wrjs73

Q: Write the formula used by Naive Bayes to compute the posterior probability $P(y|\mathbf{x})$.

A: $P(y|\mathbf{x}) = \frac{P(y) \prod_{j=1}^d P(x_j|y)}{P(\mathbf{x})}$

E: Naive Bayes applies Bayes’ theorem assuming conditional independence among features.
````

````ad-question
TYPE: T-F
ID: qTwoKeyPhasesofClassi_5_t-f_anz367

Q: The Confusion Matrix is used to compare predicted labels $\hat{y}$ to true labels $y$ on a test set.

A: T

E: It provides a summary of correct and incorrect predictions for model evaluation.
````

````ad-question
TYPE: Cloze
ID: qTwoKeyPhasesofClassi_6_cloze_dts5d3

Q: The process of applying a trained classifier to new instances is called {{c1::deduction}}.

E: Deduction refers to using the trained model to predict labels for previously unseen data.
````

````ad-question
TYPE: Cloze
ID: qTwoKeyPhasesofClassi_7_cloze_h19t3q

Q: In Decision Trees, entropy is calculated as {{c1::machen $\text{Entropy}(D) = -\sum_{i=1}^k p_i \log_2 p_i$}}.

E: Entropy measures impurity by summing over the negative probability times log probability for each class.
````

````ad-question
TYPE: Cloze
ID: qTwoKeyPhasesofClassi_7_cloze_h19t3q

Q: In Decision Trees, entropy is calculated as {{c1::machen $a$}}.

E: Entropy measures impurity by summing over the negative probability times log probability for each class.
````

