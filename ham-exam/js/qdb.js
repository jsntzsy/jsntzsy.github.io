

class QDB {

    #DB_NAME = "question_db";
    #DB_VERSION = 1;
    #STORE_QUESTION = "questions";
    #STORE_STATE = "states";
    #STORE_STAR = "stars";

    #db = null;

    deconstructor() {
        this.close();
    }

    open() {
        let request = indexedDB.open(this.#DB_NAME, this.#DB_VERSION);

        request.onupgradeneeded = (e) => {
            console.debug('数据库初始化');
            this.#db = e.target.result;
            this.#initDB(this.#db);
        }

        return new Promise((resolve, reject) => {
            request.onsuccess = (e) => {
                console.debug('数据库打开完成');
                this.#db = e.target.result;
                resolve(this.#db);
            }
            request.onerror = (e) => {
                console.error('数据库打开错误', e.target.error);
                reject(e.target.error);
            }
        })
    }

    close() {
        if (this.#db) {
            this.#db.close();
            this.#db = null;
        }
    }

    #initDB(db) {
        if (!db.objectStoreNames.contains(this.#STORE_QUESTION)) {
            const store = db.createObjectStore(this.#STORE_QUESTION, {
                keyPath: "_idx",
                autoIncrement: true
            });
            store.createIndex("by_id", "id", { unique: true });
        }
        if (!db.objectStoreNames.contains(this.#STORE_STATE)) {
            const st = db.createObjectStore(this.#STORE_STATE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(this.#STORE_STAR)) {
            const st = db.createObjectStore(this.#STORE_STAR, { keyPath: "id" });
        }
    }

    #toPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = (e) => {
                resolve(e.target.result);
            }
            request.onerror = (e) => {
                reject(e.target.error);
            }
        })
    }

    #createTransactionStore(name) {
        return this.#db.transaction(name, "readwrite").objectStore(name);
    }

    ///////////////////////////

    readQuestion(id) {
        let request = this.#createTransactionStore(this.#STORE_QUESTION).index("by_id").get(id);
        return this.#toPromise(request);
    }

    writeQuestion(q) {
        let request = this.#createTransactionStore(this.#STORE_QUESTION).put(q);
        return this.#toPromise(request);
    }

    readAllQuestions() {
        let request = this.#createTransactionStore(this.#STORE_QUESTION).getAll();
        return this.#toPromise(request);
    }

    clearQuestions() {
        let request = this.#createTransactionStore(this.#STORE_QUESTION).clear();
        return this.#toPromise(request);
    }

    ////////////////

    getState(id) {
        let request = this.#createTransactionStore(this.#STORE_STATE).get(id);
        return this.#toPromise(request);
    }
    getAllStates() {
        let request = this.#createTransactionStore(this.#STORE_STATE).getAll();
        return this.#toPromise(request);
    }

    setState(id, state) {
        let request = this.#createTransactionStore(this.#STORE_STATE).put({ id: id, state: state });
        return this.#toPromise(request);
    }

    clearStates() {
        let request = this.#createTransactionStore(this.#STORE_STATE).clear();
        return this.#toPromise(request);
    }

    deleteState(id) {
        let request = this.#createTransactionStore(this.#STORE_STATE).delete(id);
        return this.#toPromise(request);
    }

    /////////////////////

    setStar(id, star) {
        let request = null;
        if (star) {
            request = this.#createTransactionStore(this.#STORE_STAR).put({ id: id });
        } else {
            request = this.#createTransactionStore(this.#STORE_STAR).delete(id);
        }
        return this.#toPromise(request);
    }

    getStar(id) {
        let request = this.#createTransactionStore(this.#STORE_STAR).get(id);
        return this.#toPromise(request);
    }

    getAllStars() {
        let request = this.#createTransactionStore(this.#STORE_STAR).getAll();
        return this.#toPromise(request);
    }

    clearStars() {
        let request = this.#createTransactionStore(this.#STORE_STAR).clear();
        return this.#toPromise(request);
    }

    ////////////

    destroyDB() {
        this.#db.close();
        let request = indexedDB.deleteDatabase(this.#DB_NAME);
        return this.#toPromise(request);
    }

}
