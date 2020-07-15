class Watcher {
    constructor(vm, expr, cb) {
        this.vm = vm
        this.expr = expr
        this.cb = cb
        // 将旧值保存起来
        this.oldValue = this.getOldValue()
    }
    getOldValue() {
        Dep.target = this // 设置当前watcher为Dep.target
        console.log('666666')
        const oldVal = compileUtil.getValue(this.expr, this.vm)
        console.log('77777777')
        Dep.target = null // 清除当前watcher
        return oldVal
    }
    update() {
        // 判断值是否变化，有变化则更新视图
        const newVal = compileUtil.getValue(this.expr, this.vm)
        if(newVal !== this.oldValue) {
            this.cb(newVal)
        }
    }
}
class Dep {
    constructor() {
        this.subs = []
    }
    // 收集观察者
    addSub(watcher) {
        this.subs.push(watcher)
    }
    // 通知观察者去更新
    notify() {
        this.subs.forEach(w=> w.update())
    }
}
class Observer {
    constructor(data) {
        this.observe(data)
    }
    observe(data) {
        if(data && typeof data === 'object') {
            Object.keys(data).forEach(key => {
                this.defineReactive(data, key, data[key])
            })
        }
    }
    // 劫持并监听所有属性
    defineReactive(obj, key, value) {
        // 递归属性,将所有属性值进行监听
        this.observe(value)
        const dep = new Dep()
        // 监听属性值的使用和改变，例如当属性值msg被使用时，每调用一次，则在该属性相关的dep中增加一个一个观察者
        Object.defineProperty(obj, key, {
            configurable: false,
            enumerable: true,
            get() { // 只有在获取该属性值时才会调用get
                // 订阅数据变化时，往dep中添加观察者
                // Dep.target指向的是watcher
                Dep.target &&  dep.addSub(Dep.target)
                console.log('88888')
                // 打印出来的次数不解 console.log(dep.subs)
                return value
            },
            set:(newVal)=>{ // 只有在获取改变该属性值时才会调用set
                this.observe(newVal)
                if(newVal !== value) {
                    value = newVal
                }
                // 告诉Dep通知变化
                dep.notify()
            }
        })
    }
}
