/**
 * 设定PROMISE状态
 * 共有三种状态
 * pending 此时promise可以切换到 fulfilled 或者 rejected
 * fulfilled 不能迁移到其他的状态，此时必须有一个不可变的value
 * resolved 不能迁移到其他的状态，此时必须有一个reason
 * **/
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

/*-------------------工具函数-----------------*/
//判断是否是function
const isFunction = (fun)=>{
  return typeof fun === 'function'
}

//判断是否是object
const isObject = (obj)=>{
  return !!(obj && typeof obj === 'object');
}

//判断是否是promise
const isPromise = (promise) => {
  return promise instanceof myPromise;
};

//判断是否有thenable
const isThenable = (obj) =>{
  return (isFunction(obj) || isObject(obj)) && 'then' in obj
}
/*------------------------------------------*/

/*---------------promise特殊处理--------------*/

//handleCallback 函数，根据 state 状态，判断是走 fulfilled 路径还是 rejected 路径
const handleCallback = (callback,state,result)=>{
  const { onFulfilled , onRejected , resolve , reject }  = callback
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
}

//清空回调函数
const handleCallbacks = (callback,state,result) =>{
  while (callback.length){
    handleCallback(callback.shift(),state,result)
  }
}

//1.3定义切换状态函数
const transition = (promise,state,result)=>{
  //1.3.1先检查传递进来的promise状态，如果已经有状态了，此时应该设置对应的state和result
  if(promise.state !== 'pending'){
    return;
  }
  //改变pending的状态
  promise.state = state;
  promise.result = result;

  //清空promise的所有回调函数
  setTimeout(()=>{
    handleCallbacks(promise.callbacks,state,result)
  },0)
}

//1.6一些特殊的value被resolve时，要特殊处理
const resolvePromise = (promise , result , resolve , reject ) =>{
  //如果结果是当前的promise 就抛出类型错误
  if(result === promise){
    return reject(new TypeError('Can not fulfill promise with itself'))
  }
  //如果结果是另外一个promise,继续使用当前的状态
  if(isPromise(result)) {
    return result.then(resolve, reject);
  }
  //如果结果是一个thenable，
  if(isThenable(result)){
    try{
      if(isFunction(result.then)){
        return new myPromise(then.bind(result)).then(resolve,reject)
      }
    }catch (e){
      return reject(e)
    }
  }
  //如果都不是直接resolve
  resolve(result)
}

/*-----------------------------------------*/

/**
 * 1.promise的实现
 * **/
const myPromise = function (f) {
  //1.1设定初始状态
  this.state = PENDING;
  this.result = null;
  //由于需要多次调用then，所以使用数组来记录
  this.callbacks = []

  //1.2 构造 onFulfilled 来切换到 FULFILLED 状态，构造 onRejected 来切换到 RESOLVED 状态
  const onFulfilled = (value) => transition(this,FULFILLED,value)
  const onRejected = (reason) => transition(this,REJECTED,reason)

  //1.4创建标志来保证 resolve 或 reject
  let flag = false

  //1.5设置resolve的处理方式
  let resolve = (value) =>{
    //判定是否使用过
    if(flag){
      return
    }
    flag = true
    //改变promise，同时进行判定状态
    resolvePromise(this,value,onFulfilled,onRejected)
  }

  let reject = (reason) =>{
    if(flag){
      return
    }
    flag = true
    //直接改变状态
    onRejected(reason)
  }

  //1.7开始执行
  try {
    f(resolve,reject)
  }catch (e){
    reject(e)
  }
}

myPromise.prototype.then = function (onFulfilled , onReject) {
  //由于then方法返回一个promise需要手动返回一个
  return new myPromise((resolve,reject)=>{
    //设定callback
    const callback = { onFulfilled , onReject , resolve , reject }

    //如果promise的状态还在pending，返回数组进行处理
    if(this.state === PENDING){
      this.callbacks.push(callback)
    }else {
      //如果不是就放弃handle处理
      setTimeout(()=>{
        handleCallback(callback,this.state,this.result)
      },0)
    }
  })
}


/****************************************************************************/
//测试
const test = new myPromise((resolve,reject)=>{
  console.log(0);
  setTimeout(()=>{
    console.log(1);
    resolve(2)
  },1000)
})

test.then((res)=>{
  console.log(res);
  return 3
}).then((res)=>{
  console.log(res);
  return 4
}).then((res)=>{
  console.log(res);
})
console.log(5);
setTimeout(()=>{
  console.log(6);
})


