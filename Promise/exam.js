/**
 * @name JsliangPromise
 * @description 手写 Promise
 */

/* ——————————————————————————————————————————————— 设置共用函数 ——————————————————————————————————————————————— */
// 判断是否为函数
const isFunction = (obj) => {
  return typeof obj === 'function';
};

// 判断是否为对象
const isObject = (obj) => {
  return !!(obj && typeof obj === 'object');
};

// 判断是否为 thenable
const isThenable = (obj) => {
  return (
    isFunction(obj)
    || isObject(obj)
  ) && 'then' in obj;
};

// 判断是否为 Promise
const isPromise = (promise) => {
  return promise instanceof JsliangPromise;
};


/* ——————————————————————————————————————————————— 设置 Promise 状态 ——————————————————————————————————————————————— */
/**
 1. Promise 有 3 个状态：pending、fulfilled、rejected
 * pending：Promise 可以切换到 fulfilled 或者 rejected 状态
 * fulfilled：不能迁移到其他状态，必须有个不可变的 value
 * rejected：不能迁移到其他状态，必须有个不可变的 reason
 */
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

/* ——————————————————————————————————————————————— Promise 补充处理 ——————————————————————————————————————————————— */

// 3.6 handleCallback 函数，根据 state 状态，判断是走 fulfilled 路径还是 rejected 路径
const handleCallback = (callback, state, result) => {
  // 3.6.1 解构
  const { onFulfilled, onRejected, resolve, reject } = callback;

  // 3.6.2 判断
  try {
    // 3.6.3 如果是成功的
    if (state === FULFILLED) {
      // 3.6.4 判断 onFulfilled 是否为函数
      if (isFunction(onFulfilled)) {
        // 3.6.5 如果是，将它的返回值作为下一个 Promise 的 result
        resolve(onFulfilled(result));
      } else {
        // 3.6.6 如果不是，直接以当前 Promise 的 result 作为下一个 Promise 的 result
        resolve(result);
      }
    } else if (state === REJECTED) {
      if (isFunction(onRejected)) {
        resolve(onRejected(result));
      } else {
        reject(result);
      }
    }
  } catch (error) {
    // 3.6.7 如果执行过程抛错，那这个错误，作为下一个 Promise 的 rejected reason 来用
    reject(error);
  }
};

// 2.3.4 清空之前的内容
const handleCallbacks = (callbacks, state, result) => {
  while (callbacks.length) {
    handleCallback(callbacks.shift(), state, result);
  }
};

// 2.3 状态一旦不是 pending，就不允许再次转换
const transition = (promise, state, result) => {
  // 2.3.1 如果是 pending，那么就就该成对应的 state 和 result
  if (promise.state !== PENDING) {
    return;
  }

  // 2.3.2 如果不是，那么就进行设置
  promise.state = state;
  promise.result = result;

  // 2.3.3 当状态变更时，异步清空所有 callbacks
  setTimeout(() => {
    handleCallbacks(promise.callbacks, state, result);
  }, 0);
}

// 2.6 一些特殊的 value 被 resolve 时，要做特殊处理。
// 这个特殊处理，规范也明确描述了
const resolvePromise = (promise, result, resolve, reject) => {
  // 2.6.1 如果 result 是当前 Promise 本身，就抛出 TypeError 错误
  if (result === promise) {
    return reject(new TypeError('Can not fulfill promise with itself'));
  }

  // 2.6.2 如果 result 是另一个 Promise，那么沿用当前的 state 和 result 状态
  if (isPromise(result)) {
    return result.then(resolve, reject);
  }

  // 2.6.3 如果 result 是一个 thenable 对象。
  // 先去 then 函数，再 call then 函数，重新进入 The Promise resolution procedure 过程
  if (isThenable(result)) {
    try {
      if (isFunction(result.then)) {
        return new JsliangPromise(then.bind(result)).then(resolve, reject);
      }
    } catch (error) {
      return reject(error);
    }
  }

  // 2.6.4 若都不是，直接 resolve result
  resolve(result);
};

/* ——————————————————————————————————————————————— Promise 实现 ——————————————————————————————————————————————— */

// 2. 设置 Promise
const JsliangPromise = function(f) {
  // 2.1 设置初始化状态
  this.state = PENDING;
  this.result = null;

  // 3.1 .then() 可以被多次调用，所以需要设置数组进行记录
  this.callbacks = [];

  // 2.2 构造 onFulfilled 来切换到 fulfilled，构造 onRejected 来切换到 rejected 状态
  const onFulfilled = value => transition(this, FULFILLED, value);
  const onRejected = reason => transition(this, REJECTED, reason);

  // 2.3 配合 ignore 来保证 resolve/reject 只有一次调用作用
  let ignore = false;

  // 2.4 设置 resolve 的处理方式
  let resolve = (value) => {
    if (ignore) {
      return;
    }
    ignore = true;
    // 2.5 对 resolve 进行 3 条规则判定
    resolvePromise(this, value, onFulfilled, onRejected);
  };

  let reject = (reason) => {
    if (ignore) {
      return;
    }
    ignore = true;
    onRejected(reason);
  }

  // 2.6 进行尝试
  try {
    // 2.6.1 将 resolve 和 reject 作为参数传入 f 函数，方便调用
    f(resolve, reject);
  } catch (error) {
    // 2.6.2 如果 f 函数执行报错，那么错误就作为 reject 的 reason 来用
    reject(error);
  }
}

// 3. Promise.then 方法
JsliangPromise.prototype.then = function (onFulfilled, onRejected) {
  // 3.2 .then() 方法返回 Promise，所以需要 return 一个出去
  return new JsliangPromise((resolve, reject) => {

    // 3.3 设置 callback
    const callback = { onFulfilled, onRejected, resolve, reject };

    // 3.4 如果 state 处于 pending 状态，就存储进 callbacks 列表里
    if (this.state === PENDING) {
      this.callbacks.push(callback);
    } else {
      // 3.5 如果不是，就扔个 handleCallback 去处理
      // 至于为什么用 setTimeout？因为我们模拟不了微任务，那就用宏任务去解决吧
      setTimeout(() => {
        handleCallback(callback, this.state, this.result);
      }, 0);
    }
  });
};

/* ——————————————————————————————————————————————— 测试 ——————————————————————————————————————————————— */

const promise = new JsliangPromise((resolve, reject) => {
  setTimeout(() => {
    console.log(1);
    resolve(2);
  }, 1000);
});

promise.then((res) => {
  console.log('res 1：', res);
  return 3;
}).then((res) => {
  console.log('res 2：', res);
});
