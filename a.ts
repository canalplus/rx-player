// In the logger:

let loggerId = {
  current: 0,
};

class Logger {
  log(msg: string) {
    console.log(loggerId.current, msg);
  }
}

// Every asynchronous tasks go through utils like this:

function waitTimeout(timeMs: number): Promise<void> {
  const baseId = loggerId.current;
  return new Promise((res) => {
    setTimeout(() => {
      loggerId.current = baseId;
      res();
    }, timeMs);
  });
}

// In the RxPlayer code:

async function doSomething() {
  doOtherThing();
  // ...
  await waitTimeout(1000);
  logger.log("Now I log something (that'll have the right prefix ID automatically)");
}

// -------------------

// In the logger:

let loggerId = {
  current: 0,
};
class Logger {
  useCurrentContext() {
    const currentId = loggerId.current;
    return {
      log(msg: string) {
        console.log(currentId, msg);
      },
    };
  }
}

// In the RxPlayer code:

function doSomething() {
  const logger = Logger.useCurrentContext();
  doOtherThing();
  // ...
  setTimeout(() => {
    logger.log("Now I log something (that'll have the right prefix ID automatically)");
  }, 1000);
}
