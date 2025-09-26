class Random {

    constructor(){}

    public randomCode(size: number, alpha: boolean): string {

        const pool = alpha ? 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789abcdefghijklmnpqrstuvwxyz' : '0123456789';
        const rand = []; let i = -1;

        while (++i < size) rand.push(pool.charAt(Math.floor(Math.random() * pool.length)));

        return rand.join('');

    }

    public randomAlpha(size: number): string {

        const pool = 'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijklmnpqrstuvwxyz';
        const rand = []; let i = -1;

        while (++i < size) rand.push(pool.charAt(Math.floor(Math.random() * pool.length)));

        return rand.join('');

    }

    public randomNum(size: number): string {

        const pool = '0123456789';
        const rand = []; let i = -1;

        while (++i < size) rand.push(pool.charAt(Math.floor(Math.random() * pool.length)));

        return rand.join('');

    }

}

export default new Random();