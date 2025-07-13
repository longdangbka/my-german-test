## XXYY $x=5+1$ asdasasd

### Questions

````ad-question
TYPE: T-F
ID: qXXYY $x=5+1$ asdasasd_1_t-f_61nf2k

Q: Frau Dr. Elke Riedel ist eine Kollegin von Dr. Nowak. $x=5$ asdasdasdasd
![[a282db8dc65a5a98beb88413d7f1d57d549d65882c3e5d4e2250c39dd1953480e22d3d864280d3600dc36b5495d860da4a627cd1991450ea92e721eccfe045f2.jpg]]

```python
import random
from typing import Generic, Optional, TypeVar

T = TypeVar('T')


class LinkedList(Generic[T]):
    class Node:
        def __init__(self, value: T, next=None):
            self.value = value  # The data stored in the node
            self.next = next    # Pointer to the next node (or None)

    def __init__(self):
        """Constructor to create an empty linked list."""
        self.head = None  # Start with an empty list

    def is_empty(self) -> bool:
        """Check if the linked list is empty."""
        return self.head is None

    def insert(self, obj: T) -> bool:
        """
        Insert an object of type T into the linked list in ascending order.
        Return True if the object is inserted successfully.
        Return False if the object is already in the list (no duplicates allowed).
        """
        # Create a new node for the object
        new_node = self.Node(obj)

        # Handle the empty list case
        if self.head is None:
            self.head = new_node
            return True

        # Special case: Insert at the beginning if obj is smaller than the head
        if obj < self.head.value:
            new_node.next = self.head
            self.head = new_node
            return True

        # Traverse the list to find the correct position
        current = self.head
        while current.next is not None and current.next.value < obj:
            current = current.next

        # Check for duplication
        if current.next is not None and current.next.value == obj:
            return False  # Duplicate found, do not insert

        # Insert the new node at the correct position
        new_node.next = current.next
        current.next = new_node
        return True

    def __str__(self):
        """String representation of the linked list."""
        values = []
        current = self.head
        while current is not None:
            values.append(str(current.value))
            current = current.next
        return " -> ".join(values)


# Testing with random integers
def test_with_random_integers():
    # Create a linked list for integers
    ll = LinkedList[int]()

    # Generate random integers
    random_numbers = [random.randint(1, 20) for _ in range(15)]
    print(f"Random Numbers: {random_numbers}")

    # Insert random numbers into the linked list
    for num in random_numbers:
        result = ll.insert(num)
        print(f"Inserting {num}: {
              'Success' if result else 'Failed (Duplicate)'}")

    # Print the final linked list
    print("\nFinal Linked List:")
    print(ll)


# Run the test
test_with_random_integers()
```

| a   | b   |
| --- | --- |
| 1   | 2   |

A: R
E: "Sie können aber auch bei unserer Kollegin, Frau Dr. Elke Riedel, einen Termin vereinbaren."

$x=5$

```css
.App {
  text-align: center;
}

.App-logo {
  height: 40vmin;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .App-logo {
    animation: App-logo-spin infinite 20s linear;
  }
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

.App-link {
  color: #61dafb;
}

@keyframes App-logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

````


## SECOND SECTION 2 TEST

```
AUDIO: ![[audio1_1.mp3]]
```

### Transcript

Liebe Besucherinnen und Besucher,

der Rundgang durch das Schloss beginnt in 20 Minuten.

Die Führung ist auf Deutsch und Englisch.

Der Rundgang beginnt im Erdgeschoss am Eingang,

geht durch alle Räume in allen Stockwerken und endet im dritten Stock.

Dort können Sie in der Cafeteria etwas trinken und unseren Souvenirshop besuchen.

Machen Sie bitte während der Führung Handys und Smartphones aus oder stellen Sie sie auf lautlos.

### Questions

````ad-question
TYPE: T-F
ID: qSECOND SECTION 2 TEST_1_t-f_ig9n0l

Q: 

| a   | $b+5$   |
| --- | --- |
| 1   | 2   |


Die Führung im Schloss wird nur auf Deutsch angeboten.

Die Führung im Schloss wird nur auf Deutsch angeboten 2.

A: F
E: "Die Führung ist auf Deutsch und Englisch."
````


````ad-question
TYPE: Cloze
ID: qSECOND SECTION 2 TEST_2_cloze_lfhxm3

Q: {{c1::Machen $x=1$}} Sie bitte während der Führung Handys und Smartphones.

| {{c1::a}}   | b   |
| --- | --- |
| 1   | 2   |



$x=5$

$y=5_{1}$



E: 
| $a^2$  | b  |
| --- | --- |
| 1   | 2   |

ausmachen = to turn off
turn off = ausmachen

````
