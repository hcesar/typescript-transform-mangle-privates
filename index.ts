function Decorator() {
  return (_target: any, _prop: string | symbol): any => {
    return { value: () => console.log("new function") };
  };
}

class Xpto {
  callMyFunction() {
    this.myFunction();
    this.myFunction2();
  }

  @Decorator()
  private myFunction() {
    console.log("myFunction");
  }

  private myFunction2() {
    console.log("myFunction2");
  }
}

new Xpto().callMyFunction();
