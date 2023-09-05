export const randomBytes = (len) => {
    const getWebCrypto = () => {
        if (typeof window !== 'undefined' && window.crypto)
            return window.crypto;
        if (typeof self !== 'undefined' && self.crypto)
            return self.crypto;
        return undefined;
    };
    const crypto = getWebCrypto();
    if (!crypto) {
        throw new Error('randomBytes UnsupportedEnvironment');
    }
    const buf = new Uint8Array(len);
    // limit of Crypto.getRandomValues()
    // https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
    const MAX_BYTES = 65536;
    if (len > MAX_BYTES) {
        // this is the max bytes crypto.getRandomValues
        // can do at once see https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
        for (let generated = 0; generated < len; generated += MAX_BYTES) {
            // buffer.slice automatically checks if the end is past the end of
            // the buffer so we don't have to here
            crypto.getRandomValues(buf.subarray(generated, generated + MAX_BYTES));
        }
    }
    else {
        crypto.getRandomValues(buf);
    }
    return buf;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcmFuZG9tL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLENBQUMsR0FBVyxFQUFFLEVBQUU7SUFDekMsTUFBTSxZQUFZLEdBQUcsR0FBRyxFQUFFO1FBQ3hCLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxJQUFJLE1BQU0sQ0FBQyxNQUFNO1lBQUUsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ3pFLElBQUksT0FBTyxJQUFJLEtBQUssV0FBVyxJQUFJLElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ25FLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUMsQ0FBQztJQUVGLE1BQU0sTUFBTSxHQUFHLFlBQVksRUFBRSxDQUFDO0lBQzlCLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDWCxNQUFNLElBQUksS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7S0FDdkQ7SUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVoQyxvQ0FBb0M7SUFDcEMsMEVBQTBFO0lBQzFFLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQztJQUV4QixJQUFJLEdBQUcsR0FBRyxTQUFTLEVBQUU7UUFDbkIsK0NBQStDO1FBQy9DLG9HQUFvRztRQUNwRyxLQUFLLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRSxTQUFTLEdBQUcsR0FBRyxFQUFFLFNBQVMsSUFBSSxTQUFTLEVBQUU7WUFDL0Qsa0VBQWtFO1lBQ2xFLHNDQUFzQztZQUN0QyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDO1NBQ3hFO0tBQ0Y7U0FBTTtRQUNMLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDN0I7SUFFRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMsQ0FBQyJ9