import lrz from 'lrz'
import template from './dashboard.html'
import Command from '../../range/command'

/**
 * Created by peak on 2017/2/10.
 */
export default {
    template,
    data() {
        return {
            imageUrl: '',
            upload: {
                status: 'ready', // progress,success,error,abort
                errorMsg: null,
                progressComputable: false,
                complete: 0
            }
        }
    },
    methods: {
        reset() {
            this.upload.status = 'ready'
        },
        pick() {
            this.$refs.file.click()
        },
        setUploadError(msg) {
            this.upload.status = 'error'
            this.upload.errorMsg = msg
        },
        startUpload() {
            const component = this
            const config = this.$options.module.config
            console.log(config);
            const file = this.$refs.file.files[0]
            if (file.size > config.sizeLimit) {
                this.setUploadError(this.$parent.locale['exceed size limit'])
                return
            }
            this.$refs.file.value = null

            // 上传服务器
            component.uploadToServer(file)
        },
        awsSignature(file) {
            console.log(file);
            const config = this.$options.module.config
            return new Promise(function(resolve, reject) {
                const xhr = new XMLHttpRequest()

                xhr.onload = () => {
                    console.log(xhr.responseText);
                    resolve(xhr.responseText)
                }

                xhr.open('GET', config.awsSignatureUrl + '&filename=' + file.name)

                var headers = config.headers;

                headers.forEach(function(header) {
                    var headerName = Object.keys(header);
                    var headerValue = header[headerName];
                    xhr.setRequestHeader(headerName, headerValue);
                });

                xhr.send()
            });

        },
        uploadToServer(file) {
            const component = this

            component.awsSignature(file).then(function(signature) {
                signature = JSON.parse(signature)
                const config = component.$options.module.config
                const formData = new FormData()

                formData.append('key', file.name)
                formData.append('acl', signature.params.acl)
                formData.append('success_action_status', '201')
                formData.append('policy', signature.params.policy)
                formData.append('x-amz-credential', signature.params['x-amz-credential'])
                formData.append('x-amz-algorithm', signature.params['x-amz-algorithm'])
                formData.append('x-amz-date', signature.params['x-amz-date'])
                formData.append('x-amz-signature', signature.params['x-amz-signature'])
                formData.append('file', file)

                const xhr = new XMLHttpRequest()

                xhr.upload.onprogress = (e) => {
                    component.upload.status = 'progress'
                    if (e.lengthComputable) {
                        component.upload.progressComputable = true
                        const percentComplete = e.loaded / e.total
                        component.upload.complete = (percentComplete * 100).toFixed(2)
                    } else {
                        component.upload.progressComputable = false
                    }
                }

                xhr.onload = () => {

                    if (xhr.status != 201) {
                        component.setUploadError(`request error,code ${xhr.status}`)
                        return
                    }
                    try {
                        const url = config.uploadHandler(xhr.responseText)
                        if (url) {
                            var video = '<video controls>';
                            video += '<source src="' + url + '" type="video/' + url.split('.').pop() + '">';
                            video += '</video>'; 
                            console.log(url);
                            component.$parent.execCommand(Command.INSERT_VIDEO, video)
                        }
                    } catch (err) {
                        component.setUploadError(err.toString())
                    } finally {
                        component.upload.status = 'ready'
                    }
                }

                xhr.onerror = () => {
                    // find network info in brower tools
                    component.setUploadError('request error')
                }

                xhr.onabort = () => {
                    component.upload.status = 'abort'
                }

                xhr.open('POST', config.server)


                xhr.send(formData)
            })

        }
    }
}
