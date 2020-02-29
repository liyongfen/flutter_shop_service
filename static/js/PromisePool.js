class PromisePool {
    constructor(processor, concurrency, tasksData) {

        if (typeof concurrency !== 'number') {
            throw Error('concurrency is must number');
        }
        if (!processor instanceof Promise) {
            throw Error('processor is must instanceof Promise');
        }

        this._fulfilled = 0;
        this._rejected = 0;
        this._pending = 0;
        this._total = 0;
        this._index = 0; //总的指针

        this._tasksData = []; //任务队列
        this.onProgress = void 0;
        this._currentConcurrency = 0;//当前并发指针
        this.concurrency = concurrency; //并发数

        this.retries = 0; //重试的次数
        this.retryIntervalMultiplier = 1;
        this.maxRetryInterval = Infinity;
        this.retryInterval = 0;

        this.processor = processor;
        this._progressError = null;

        if (tasksData) {
            this.add(tasksData);
        }
    }
    add(tasksData) {
        if (this._deferred && this._deferred.state !== 'pending') {
            console.warn('all the tasks have been accomplished, reset the pool before adding new tasks again.');
            return;
        }
        if (!Array.isArray(tasksData)) {
            tasksData = [tasksData];
        }
        this._total += tasksData.length;
        this._pending += tasksData.length;
        this._tasksData = this._tasksData.concat(tasksData);

        // if (!this._pauseDeferred) {
        //     this._start();
        // }
    }
    start(onProgress) {
        if (this._deferred) {
            if (this._pauseDeferred) {
                console.warn('tasks pool has already been started, use resume to continue the tasks.');
            } else {
                console.warn('tasks pool has already been started, reset it before start it again.');
            }
        } else {
            this._deferred = MPromise.deferred();
            this._deferred.state = 'pending';
            this.onProgress = onProgress;
            this._start();
        }
        return this._deferred.promise;
    }
    _start() {
        if (this._checkProgressError()) {
            return;
        }
        while (this._currentConcurrency < this.concurrency && this._tasksData.length) {
            this._currentConcurrency++;
            this._process(this._tasksData.shift(), this._index++);
        }
        if (!this._currentConcurrency) {
            this._deferred.resolve({
                total: this._total,
                fulfilled: this._fulfilled,
                rejected: this._rejected
            });
        }
    }
    _process(taskData, index) {
        let _this = this;
        MPromise.retry(function processor() {
            return _this.processor(taskData, index);
        }, function onFail(reason, retries) {
            if (retries) {
                _this._notifyProgress(index, false, reason, retries)
            } else {//尝试次数用完依然失败
                _this._rejected++;
                _this._pending--;
                _this._notifyProgress(index, false, reason, retries);
                _this._next();
            }
        }, {
            limit: this.retries,
            interval: this.retryInterval,
            maxInterval: this.maxRetryInterval,
            intervalMultiplier: this.retryIntervalMultiplier
        }).then(function (value) {
            _this._fulfilled++;
            _this._pending--;
            _this._notifyProgress(index, value, null, null);
            _this._next();
        });
    }
    _next() {
        this._currentConcurrency--;

        if (this._pauseDeferred) {//暂停
            if (this._currentConcurrency == 0) {
                this._pauseDeferred.resolve(null);//暂停，处理完了
                this._pauseDeferred.state = 'fulfilled';
            }
        } else {
            this._start();
        }
    }
    _notifyProgress(index, success, errror, retries) {
        if (!this._progressError && typeof this.onProgress == 'function') {
            let progress = {
                index: index,
                success: success,
                error: errror,
                retries: retries,
                fulfilled: this._fulfilled,
                rejected: this._rejected,
                pending: this._pending,
                total: this._total,
            };
            try {
                this.onProgress(progress);
            } catch (e) {
                this._progressError = e;
            }
        }
    }
    _checkProgressError = function () {
        if (!this._progressError) {
            return false;
        }
        if (this._deferred && this._deferred.state === 'pending') {
            this._deferred.reject(this._progressError);
            this._deferred.state = 'rejected';
        }
        return true;
    }
    pause() {
        if (this._pauseDeferred) {
            if (this._pauseDeferred.state !== 'pending') {//任务已经暂停
                console.warn('tasks have already been paused.');
            } else {
                console.warn('tasks are already been pausing.');//任务暂停中。。。
            }
        } else {
            this._pauseDeferred = MPromise.deferred();
            if (!this._currentConcurrency) {  //当前没有要处理的并发值
                this._pauseDeferred.resolve(null);
                this._pauseDeferred.state = 'fulfilled';
            }
        }

        return this._pauseDeferred.promise;
    }
    resume() { //可能暂停中，可能完全暂停了
        if (!this._pauseDeferred) {
            console.warn('tasks are not paused.');
            return;
        }
        this._pauseDeferred = null;
        this._start();
    }
    reset() {
        this.pause().then(() => {
            this._rejected = 0;
            this._fulfilled = 0;
            this._pending = 0;
            this._total = 0;
            this._index = 0;

            this._tasksData = [];
            this._deferred = null;
            this._pauseDeferred = null;

            this.onProgress = void 0;
            this._progressError = null;
        });
    }
}