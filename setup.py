"""
Setup configuration for the calculator package.
"""
from setuptools import setup, find_packages

setup(
    name='calculator',
    version='1.0.0',
    description='A simple calculator with SOLID principles',
    author='',
    license='MIT',
    packages=find_packages(),
    python_requires='>=3.7',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
    ],
)

