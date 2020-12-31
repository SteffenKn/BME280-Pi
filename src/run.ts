import {Example, Person} from './index';

const example: Example = new Example();
const person: Person = {
  name: 'Peter',
};

example.hello(person);
example.start();
