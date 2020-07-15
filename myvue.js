const compileUtil = {
    getValue(expr, vm) {
        // 通过reduce方法，data指的是vm.$data的值，如果expr是person.name这样的值，会先取出
        // data.person然后取出data.person.name的值
        return expr.split('.').reduce((data,currentValue) => {
            return data[currentValue]
        },vm.$data)
    },
    setValue(expr,vm, newVal) {
        const len = expr.split('.').length
        return expr.split('.').reduce((data,currentValue, index) => {
            if(index === len -1) { // 为最后一个时则将新值赋值给它
             return    data[currentValue] = newVal
            } else {
             return data[currentValue] // reduce中此处返回的值为第一个参数，即上面的data
            }
        },vm.$data) // 初始data的值
    },
    getContent(expr, vm) {
        return  expr.replace(/\{\{(.+?)\}\}/g, (...args)=> {
            return  this.getValue(args[1],vm)
        })
    },
    text(node, expr,vm) { // node为当前节点 expr为msg,
        let value;
        if(expr.startsWith('{{')) { // 为{{文本指令时}}
            let dirName = ''
            value = expr.replace(/\{\{(.+?)\}\}/g, (...args)=> {
                new Watcher(vm, args[1],()=>{
                    this.updater.htmlUpdater(node, this.getContent(expr, vm))
                })
                return  this.getValue(args[1],vm)
            })
            this.updater.textUpdater(node, value)
        } else {
            value = this.getValue(expr,vm)
            new Watcher(vm, expr,(newVal)=>{
                this.updater.textUpdater(node, newVal)
            })
            this.updater.textUpdater(node, value)
        }
    },
    html(node, expr,vm) {
        const value = this.getValue(expr,vm)
        new Watcher(vm, expr,(newVal)=>{
            this.updater.htmlUpdater(node, newVal)
        })
        this.updater.htmlUpdater(node, value)
    },
    model(node, expr,vm) {
        const value = this.getValue(expr,vm)
        new Watcher(vm, expr,(newVal)=>{
            this.updater.modelUpdater(node, newVal)
        })
        node.addEventListener('input',(e)=>{
            console.log(e.target.value)
            console.log(expr)
            console.log(vm)
            this.setValue(expr,vm, e.target.value)
        })
        this.updater.modelUpdater(node, value)
    },
    on(node, expr, vm, eventName) { // expr函数表达式compileFun，eventName为事件名click
        const fn = vm.$options.methods[expr]
        node.addEventListener(eventName,fn.bind(vm), false) // bind用以绑定this指向
    },
    // 进行数据转换
    updater: {
        textUpdater(node,value) {
            node.textContent = value // 节点属性手动替换
        },
        htmlUpdater(node,value) {
            node.innerHTML = value
        },
        modelUpdater(node,value) {
            node.value = value
        }
    }
}
class Compile {
    constructor(el, vm) {
        console.log(el)
        console.log(vm)
        // 通过获传递进来的id来获取对应的node节点
        this.el = this.isElementNode(el) ? el : document.querySelector(el) // 此时this.el则为整个根元素
        this.vm = vm
        // 1、获取文档碎片对象，放入对象中会减少页面的回流和重绘
        const fragment = this.node2Fragment(this.el)
        // 2、编译模板
        this.compile(fragment)
        //3、追加子元素到根节点上
        this.el.appendChild(fragment)
    }
    isElementNode (node) {
        return node.nodeType === 1 // 如果是节点对象，则返回true
    }
    // 创建文本碎片对象
    node2Fragment (el) {
        // 创建文档碎片对象
        const  f = document.createDocumentFragment()
        let firstChild;
        while (firstChild = el.firstChild) {
            f.appendChild(firstChild)
        }
        return f
    }
    // 编译函数入口
    compile(fragment) {
        // 1、获取每个子节点
        const  chidlNode = fragment.childNodes
        chidlNode.forEach((child) => {
            if(this.isElementNode(child)) {
                this.compileNode(child)
            } else {
                this.compileText(child)
            }
            if(child.childNodes && child.childNodes.length > 0) {
                this.compile(child) // 有子节点则回调
            }
        })
    }
    // 编译节点
    compileNode(node) {
        const attributes = node.attributes // 获取节点对象的属性
        for(let item of attributes) {
            const {name, value} = item // name为v-text @click  value为msg
            console.log(name, value)
            if(this.isDirective(name)) { // 判断是否是一个指令 v-text v-html v-model v-on
                const [,dirctive] = name.split('-') // 分割成text html ....
                const [dirName, eventName] = dirctive.split(':') // 如果有on:click类似语句，则会把事件名区分出来 dirName为指令名，eventName为事件名
                compileUtil[dirName](node, value,this.vm,eventName)
                node.removeAttribute('v-'+ dirctive) // 删除该属性
            } else if(this.isEventDirective(name)) {
                const [,eventName] = name.split('@')
                compileUtil['on'](node, value,this.vm,eventName)
            }
        }
    }
    // 编译文本
    compileText(node) {
        const content = node.textContent // 获取文本节点的中的变量值（也会获取到文本值） {{msg}}、123
       if(/\{\{(.+?)\}\}/.test(content)) {  //获取到{{msg}}、{{debug}}
          compileUtil['text'](node, content, this.vm)
       }
    }
    isDirective(name) {
        return name.startsWith('v-')
    }
    isEventDirective(name) {
        return name.startsWith('@')
    }


}
class Mvue {
    constructor(options) {
        this.$el = options.el
        this.$data = options.data
        this.$options = options
        if(this.$el) {
            // 1、实现一个数据观察者
            new Observer(this.$data)
            // 2、实现一个解析器指令
            new Compile(this.$el, this)
            // 使用一个代理  以后调用数据时不在需要vm.$data.msg  直接vm[msg]
            this.proxyData(this.$data)
        }
    }
    proxyData(data) {
        for(const key in data) {
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set(v) {
                    data[key] = v
                }
            })
        }
    }
}
