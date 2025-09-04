
class QuestionsManager {

    EXAM_STANDARD = {
        "a": {
            single: 32,
            multi: 8,
            time: 40,
            pass: 30
        },
        "b": {
            single: 45,
            multi: 15,
            time: 60,
            pass: 45
        },
        "c": {
            single: 70,
            multi: 20,
            time: 90,
            pass: 70
        }
    };

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

    getLevelStandard(level = undefined) {
        if (!level) {
            level = this.currentLevel;
        }
        return this.EXAM_STANDARD[level];
    }

    get Questions() { return this.currentQuestions; }

    //////////////

    async exportProfile(file) {

        let states = await this.#db.getAllStates();
        let stars = await this.#db.getAllStars();

        let profile = {
            version: localStorage.getItem('q_ver'),
            lastId: localStorage.getItem('q_last_id'),
            lastStudyId: localStorage.getItem('q_last_study_id'),
            level: localStorage.getItem('q_level'),
            onlyDiff: localStorage.getItem('q_onlyDiff'),
            showMemoryMethod: localStorage.getItem('q_show_memory_method'),
            host: window.location.host,
            states: states,
            stars: stars
        };

        return JSON.stringify(profile);
    }

    async loadProfile(profile) {

        profile = JSON.parse(profile);

        await this.#db.clearStates();
        await this.#db.clearStars();

        for (const s of profile.states) {
            await this.#db.setState(s.id, s.state);
        }
        for (const s of profile.stars) {
            await this.#db.setStar(s.id, true);
        }

        if (profile.version) {
            localStorage.setItem('q_ver', profile.version);
        }
        if (profile.lastId) {
            localStorage.setItem('q_last_id', profile.lastId);
        }
        if (profile.lastStudyId) {
            localStorage.setItem('q_last_study_id', profile.lastStudyId);
        }
        if (profile.level) {
            localStorage.setItem('q_level', profile.level);
        }
        if (profile.onlyDiff) {
            localStorage.setItem('q_onlyDiff', profile.onlyDiff);
        }
        if (profile.showMemoryMethod) {
            localStorage.setItem('q_show_memory_method', profile.showMemoryMethod);
        }

        return true;
    }
}

