
class QuestionsManager {

    #db = null;
    currentQuestions = [];
    currentLevel = "a";
    onlyDiff = false;

    async init(servVer) {

        // 打开数据库
        this.#db = new QDB();
        await this.#db.open();

        // 按需更新题库
        if (servVer && this.needUpdate(servVer)) {
            await this.updateQuestions();
            localStorage.setItem("q_ver", servVer);
        }

        // 根据等级获取题表
        this.currentLevel = localStorage.getItem("q_level") || "a";
        this.onlyDiff = localStorage.getItem("q_onlyDiff") === "true";
        this.currentQuestions = await this.getLevelQuestions(this.currentLevel, this.onlyDiff);
        console.debug('获取当前题表', this.currentLevel, this.currentQuestions.length);

    }

    async clearCache() {
        await this.#db.destroyDB();
        localStorage.removeItem("q_ver");
    }

    needUpdate(servVer) {
        const localVer = localStorage.getItem("q_ver");
        return localVer == null || localVer !== servVer;
    }

    async updateQuestions() {

        //下载新题库并从json转换为js对象
        let resp = await fetch("data/questions.json");
        let qs = await resp.json();
        console.debug('新题库下载完成');

        //清空原题库
        await this.#db.clearQuestions();


        //添加新题库
        let result = [];
        for (const q of qs) {
            await this.#db.writeQuestion(q);
            result.push(q);
        }

        console.debug('解析题库,写入数据库完成');

        //返回题库列表
        return result;
    }

    async getLevelQuestions(level, onlyDiff) {

        let qs = await this.#db.readAllQuestions();
        let ss = await this.#db.getAllStates();
        let stars = await this.#db.getAllStars();
        if (level !== 'all') {
            qs = qs.filter(q => q[`in_${level}`]);
        }

        if (onlyDiff && level !== 'all' && level !== 'a') {
            if (level === 'b') {
                qs = qs.filter(q => q.in_b && !q.in_a);
            } else if (level === 'c') {
                qs = qs.filter(q => q.in_c && !q.in_b && !q.in_a);
            }
        }

        for (let i = 0; i < qs.length; i++) {
            qs[i].index = i;
            qs[i].state = ss.find(ss => ss.id === qs[i].id)?.state || 0;
            qs[i].star = !!stars.find(s => s.id === qs[i].id);
        }

        return qs;
    }

    async setState(id, state) {
        const q = this.currentQuestions.find(q => q.id === id);
        if (q) {
            await this.#db.setState(id, state);
            q.state = state;
        }
    }

    async setStar(id, star) {
        const q = this.currentQuestions.find(q => q.id === id);
        if (q) {
            await this.#db.setStar(id, star);
            q.star = star;
        }
    }

    async switchLevel(level, onlyDiff) {
        this.currentQuestions = await this.getLevelQuestions(level, onlyDiff);
        this.currentLevel = level;
        this.onlyDiff = onlyDiff;
        localStorage.setItem('q_level', level);
        localStorage.setItem('q_onlyDiff', onlyDiff);
    }

    async resetProgress() {
        await this.#db.clearStates();
        this.currentQuestions.forEach(q => { q.state = 0; });
        localStorage.removeItem('q_last_id');
        localStorage.removeItem('q_last_study_id');
    }

    async clearStars() {
        await this.#db.clearStars();
        this.currentQuestions.forEach(q => { q.star = false; });
    }

    async clearWrongStates() {
        for (const q of this.currentQuestions) {
            if (q.state === 2) {
                await this.#db.deleteState(q.id);
                q.state = 0;
            }
        }
    }

    async resetAll() {
        await this.#db.destroyDB();
        localStorage.removeItem('q_ver');
        localStorage.removeItem('q_last_id');
        localStorage.removeItem('q_last_study_id');
        localStorage.removeItem('q_level');
        localStorage.removeItem('q_onlyDiff');
    }

    get Questions() { return this.currentQuestions; }
}

