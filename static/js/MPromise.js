class MPromise extends Promise{
    static deferred() { 
        let defer = {};
        defer.promise = new MPromise((resolve, reject) => {
            defer.resolve = resolve;
            defer.reject = reject;
        });
        return defer;
    }
    static retry(process, onFail, options) {
        let limit = Infinity; //重试的次数限制
        let interval = 0; //间隔
        let maxInterval = Infinity; //最大间隔
        let intervalMultiplier = 1; //间隔乘数

        if (typeof onFail != 'function') {
            onFail = null;
        } 
        if (typeof options == 'number') {
            limit = options;
        } else if (options && typeof options == 'object') {
            
            limit = typeof options.limit == 'number' ? options.limit : limit;
            maxInterval = typeof options.maxInterval == 'number' ? options.maxInterval : maxInterval;
            interval = Math.min(typeof options.interval == 'number' ? options.interval : interval, maxInterval);
            intervalMultiplier = typeof options.intervalMultiplier == 'number' ? options.intervalMultiplier : intervalMultiplier;
        }

        return process().catch(function (reason) {
            return retry(reason, limit - 1, Math.min(interval * intervalMultiplier));
        });


        function retry(reason, limit, interval) {
            if (onFail) {
                onFail(reason, limit);
            }

            if (limit <= 0) {
                throw reason;
            }

            return MPromise.resolve().wait(Math.floor(interval)).then(function () {
                return process();
            }).catch(function (reason) {
                return retry(reason, limit - 1, Math.min(interval * intervalMultiplier));
            });
        }
    }
    wait(ms) { 
        return this.then((value) => {
            return new MPromise(function (resolve, reject) {
                setTimeout(() => resolve(value), ms);
            });
        }, (reason) => {
                return new MPromise(function (resolve, reject) {
                setTimeout(() => reject(reason), ms);
            });
        });
    }
}