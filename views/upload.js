const SIZE = 2 * 1024 * 1024;

function createFileChunk(file, size = SIZE) {
    const fileChunkList = [];
    let cur = 0;
    while (cur < file.size) {
        fileChunkList.push({ file: file.slice(cur, cur + size) });
        cur += size;
    }
    return fileChunkList;
}
function request({url, method = "POST", data, headers = {}, onProgress = e => e, requestList}) {
    
    return new Promise(resolve => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = onProgress;
        xhr.open(method, url);
        Object.keys(headers).forEach(key =>
            xhr.setRequestHeader(key, headers[key])
        );
        xhr.onload = e => {
            resolve({
                data: e.target.response
            });
        };
        xhr.send(data);
    });
}

async function uploadChunks(chunks) {
    const requestList = chunks.map(({ chunk, hash, filename }) => {
        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("hash", hash);
        formData.append("filename", filename);

        return { formData };
    }).map(async ({ formData }) =>
        request({
            url: "http://localhost:3000/upload",
            data: formData
        })
    );
    await Promise.all(requestList); // 并发切片
}

async function handleUpload(file){
    if (!file) {
        return;
    }
       
    const fileChunkList = createFileChunk(file);
    const chunks= fileChunkList.map(({ file }, index) => ({
        filename: file.name,
        chunk: file,
        hash: file.name + "-" + index // 文件名 + 数组下标
    }));
    await uploadChunks(chunks);
}

async function mergeRequest(file) {
    await request({
        url: "http://localhost:3000/merge",
        headers: {
            "content-type": "application/json"
        },
        data: JSON.stringify({
            size: SIZE,
            filename: file.name
        })
    });
}




